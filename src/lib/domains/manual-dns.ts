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

function mailerKind(env: CloudflareEnv): "cloudflare" | "smtp" | "none" {
	const mailer = env.EMAIL as unknown as MailerLike;
	// Prefer SMTP_URL when set — Coolify Postfix path must win over leftover CF_TOKEN.
	if (process.env.SMTP_URL?.trim()) return "smtp";
	if (mailer?.kind === "cloudflare" || mailer?.kind === "smtp") return mailer.kind;
	if (process.env.CF_ACCOUNT_ID?.trim() && process.env.CF_TOKEN?.trim()) return "cloudflare";
	return mailer?.configured ? "smtp" : "none";
}

/**
 * DNS a self-hosted / SaaS install needs when Mailflare is not managing the
 * customer zone (`zoneId = "manual"`). Records are listed as "missing" for the
 * operator to publish; the app cannot write their DNS.
 *
 * - Inbound: MX → MAIL_HOSTNAME (SMTP :25 on the Coolify host).
 * - Outbound via Cloudflare Email Sending: root SPF must include Cloudflare,
 *   plus the cf-bounce subdomain records Cloudflare shows when you onboard
 *   the domain in Email Sending (DKIM is copied from that dashboard).
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

	const sending: Array<{ type: string; name: string; content: string; ttl: number }> = [];
	if (kind === "cloudflare") {
		sending.push(
			{
				type: "TXT",
				name: hostname,
				content: `v=spf1 include:_spf.mx.cloudflare.net a:${host} ~all`,
				ttl: 3600,
			},
			{
				type: "TXT",
				name: `_dmarc.${hostname}`,
				content: "v=DMARC1; p=none",
				ttl: 3600,
			},
			{
				type: "TXT",
				name: `cf-bounce.${hostname}`,
				content: "v=spf1 include:_spf.mx.cloudflare.net ~all",
				ttl: 3600,
			},
			{
				type: "TXT",
				name: `cf-bounce._domainkey.${hostname}`,
				content: "(paste DKIM value from Cloudflare Email Sending → Settings after onboarding this domain)",
				ttl: 3600,
			},
		);
	} else {
		sending.push(
			{ type: "TXT", name: hostname, content: `v=spf1 a:${host} ~all`, ttl: 3600 },
			{ type: "TXT", name: `_dmarc.${hostname}`, content: "v=DMARC1; p=none", ttl: 3600 },
		);
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
	}

	return {
		routing: { records: [], missing: routingMissing, status: "manual" },
		sending,
		sendingEnabled: sendingConfigured,
		dkimSelector: kind === "cloudflare" ? "cf-bounce" : kind === "smtp" ? OUTBOUND_DKIM_SELECTOR : undefined,
	};
}
