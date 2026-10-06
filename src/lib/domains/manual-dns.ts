import type { DomainDnsView } from "@/lib/domains/service";
import { normalizeMailHostname } from "@/lib/domains/hostname";
import {
	describeOutboundDkimStatus,
	OUTBOUND_DKIM_SELECTOR,
	readOutboundDkimTxt,
	syncOutboundSenderDomains,
} from "@/lib/outbound/sender-domains";

type MailerLike = { configured?: boolean; kind?: string };

function mailHost(): string {
	const raw =
		process.env.MAIL_HOSTNAME?.trim() ||
		process.env.APP_URL?.trim() ||
		"mail.example.com";
	const host = normalizeMailHostname(raw);
	return host || "mail.example.com";
}

function mailerKind(env: CloudflareEnv): "smtp" | "none" {
	const mailer = env.EMAIL as unknown as MailerLike;
	if (process.env.SMTP_URL?.trim() || mailer?.kind === "smtp" || mailer?.configured) return "smtp";
	return "none";
}

/**
 * DNS a self-hosted / SaaS install needs when Mailflare is not managing the
 * customer zone (`zoneId = "manual"`). Records are listed as "missing" for the
 * operator to publish; the app cannot write their DNS.
 *
 * - Inbound: MX → MAIL_HOSTNAME (SMTP :25 on the Coolify host).
 * - Outbound via SMTP_URL / Postfix: SPF authorizes the mail host; DKIM uses
 *   the shared Postfix selector (`mail`) once keys are generated for that hostname.
 */
export async function getManualDomainDns(env: CloudflareEnv, hostname: string): Promise<DomainDnsView> {
	const host = mailHost();
	const kind = mailerKind(env);
	const sendingConfigured = kind !== "none";

	if (kind === "smtp") {
		await syncOutboundSenderDomains(env);
	}

	const routingMissing = [
		{ type: "MX", name: hostname, content: `10 ${host}`, ttl: 3600 },
	];

	const sending: Array<{ type: string; name: string; content: string; ttl: number }> = [
		{ type: "TXT", name: hostname, content: `v=spf1 a:${host} ~all`, ttl: 3600 },
		{ type: "TXT", name: `_dmarc.${hostname}`, content: "v=DMARC1; p=none", ttl: 3600 },
	];
	if (kind === "smtp") {
		const dkimTxt = await readOutboundDkimTxt(hostname);
		const dkimStatus = dkimTxt ? null : await describeOutboundDkimStatus(hostname);
		sending.push({
			type: "TXT",
			name: `${OUTBOUND_DKIM_SELECTOR}._domainkey.${hostname}`,
			content: dkimTxt ?? `(${dkimStatus?.hint ?? "waiting for Postfix DKIM"})`,
			ttl: 3600,
		});
	}

	return {
		routing: { records: [], missing: routingMissing, status: "manual" },
		sending,
		sendingEnabled: sendingConfigured,
		dkimSelector: kind === "smtp" ? OUTBOUND_DKIM_SELECTOR : undefined,
	};
}
