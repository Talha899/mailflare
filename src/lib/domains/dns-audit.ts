import type { CfDnsRecord } from "@/lib/cloudflare-api.types";
import { queryDns, type DnsQueryType } from "@/lib/dns-query";

export type DnsAuthRecord = "mx" | "spf" | "dkim" | "dmarc";
export type DnsAuthStatus = "ok" | "missing" | "unknown";

export type DnsAuthCheck = {
	record: DnsAuthRecord;
	label: string;
	name: string;
	status: DnsAuthStatus;
	found: string[];
};

export type DomainDnsAudit = {
	mx: DnsAuthCheck;
	spf: DnsAuthCheck;
	dkim: DnsAuthCheck;
	dmarc: DnsAuthCheck;
};

type AuditInput = {
	routing: { records: CfDnsRecord[]; missing: CfDnsRecord[] };
	sending: CfDnsRecord[];
	dkimSelector?: string;
};

function isTxt(record: CfDnsRecord) {
	return record.type?.toUpperCase() === "TXT";
}

function normalizeDnsHost(value: string): string {
	return value.trim().toLowerCase().replace(/\.$/, "");
}

/** MX targets Mailflare expects (from checklist), e.g. mail.aiorders.io */
export function expectedMxHosts(view: AuditInput): string[] {
	const rows = [...view.routing.records, ...view.routing.missing];
	const hosts: string[] = [];
	for (const row of rows) {
		if (row.type?.toUpperCase() !== "MX") continue;
		const content = (row.content ?? "").trim();
		const match = content.match(/^(?:\d+\s+)?(\S+)/);
		const host = normalizeDnsHost(match?.[1] ?? content);
		if (host) hosts.push(host);
	}
	return [...new Set(hosts)];
}

/** SPF mechanism needles from checklist, e.g. a:mail.aiorders.io */
export function expectedSpfNeedles(view: AuditInput): string[] {
	const rows = [...view.routing.records, ...view.routing.missing, ...view.sending];
	const needles: string[] = [];
	for (const row of rows) {
		if (!isTxt(row)) continue;
		const name = (row.name ?? "").toLowerCase();
		const content = row.content ?? "";
		if (!/v=spf1/i.test(content)) continue;
		if (name.includes("_dmarc") || name.includes("_domainkey") || name.startsWith("cf-bounce.")) continue;
		for (const part of content.split(/\s+/)) {
			if (/^(a|include|mx|ip4|ip6):/i.test(part)) needles.push(part.toLowerCase());
		}
	}
	return [...new Set(needles)];
}

export function mxAnswerMatchesExpected(answer: string, expectedHosts: string[]): boolean {
	if (!expectedHosts.length) return !/^0\s*\.?$/.test(answer.trim());
	const host = normalizeDnsHost(answer.replace(/^\d+\s+/, ""));
	return expectedHosts.some((expected) => host === expected || host.endsWith(`.${expected}`));
}

export function spfAnswerMatchesExpected(answer: string, needles: string[]): boolean {
	if (!/v=spf1/i.test(answer)) return false;
	if (!needles.length) return true;
	const lower = answer.toLowerCase();
	return needles.some((needle) => lower.includes(needle));
}

async function check(
	record: DnsAuthRecord,
	label: string,
	name: string,
	type: DnsQueryType,
	matches: (value: string) => boolean,
): Promise<DnsAuthCheck> {
	try {
		const answers = await queryDns(name, type);
		const found = answers.filter(matches);
		// Keep raw answers when nothing matched so the UI can show "wrong host" context.
		return {
			record,
			label,
			name,
			status: found.length > 0 ? "ok" : "missing",
			found: found.length > 0 ? found : answers,
		};
	} catch {
		return { record, label, name, status: "unknown", found: [] };
	}
}

/**
 * Independently verifies the public DNS a domain needs, rather than trusting
 * the zone records the Cloudflare API reports. For manual/Postfix installs the
 * expected MX/SPF come from the checklist (MAIL_HOSTNAME), so Hostinger (or any
 * other) MX/SPF does not count as configured.
 */
export async function auditDomainDns(
	hostname: string,
	view: AuditInput,
): Promise<DomainDnsAudit> {
	const expected = [...view.routing.records, ...view.routing.missing, ...view.sending];
	const mxHosts = expectedMxHosts(view);
	const spfNeedles = expectedSpfNeedles(view);
	const dkimName =
		(view.dkimSelector
			? `${view.dkimSelector}._domainkey.${hostname}`
			: undefined) ??
		expected.find((record) => isTxt(record) && /_domainkey/i.test(record.name ?? ""))?.name;

	const [mx, spf, dmarc] = await Promise.all([
		check("mx", "MX", hostname, "MX", (value) => mxAnswerMatchesExpected(value, mxHosts)),
		check("spf", "SPF", hostname, "TXT", (value) => spfAnswerMatchesExpected(value, spfNeedles)),
		check("dmarc", "DMARC", `_dmarc.${hostname}`, "TXT", (value) => /v=DMARC1/i.test(value)),
	]);

	const dkim: DnsAuthCheck = dkimName
		? await check("dkim", "DKIM", dkimName, "TXT", () => true)
		: {
				record: "dkim",
				label: "DKIM",
				name: `*._domainkey.${hostname}`,
				status: "unknown",
				found: [],
			};

	return { mx, spf, dkim, dmarc };
}
