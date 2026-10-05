import { authFetch } from "@/lib/auth/client";
import type { DnsAuthRecord, DnsAuthStatus, DnsRecord, DomainPreflightResponse } from "./types";

export const dnsAuthRecords: DnsAuthRecord[] = ["mx", "spf", "dkim", "dmarc"];

export const dnsAuthDescriptions: Record<DnsAuthRecord, string> = {
	mx: "Routes incoming email to Mailflare",
	spf: "Authorizes Mailflare to send email",
	dkim: "Signs outgoing email for deliverability",
	dmarc: "Helps prevent email spoofing",
};

/** Pick the checklist rows that belong to one auth check (manual Setup expand). */
export function recordsForAuthCheck(
	record: DnsAuthRecord,
	candidates: DnsRecord[],
	auditName?: string,
): DnsRecord[] {
	const lower = (value?: string) => (value ?? "").toLowerCase();
	const nameHint = lower(auditName);
	const matched = candidates.filter((row) => {
		const type = lower(row.type);
		const name = lower(row.name);
		const content = lower(row.content);
		if (record === "mx") return type === "mx";
		if (record === "spf") {
			return type === "txt" && (content.includes("v=spf1") || name === nameHint || (!name.includes("_dmarc") && !name.includes("_domainkey") && content.includes("spf")));
		}
		if (record === "dkim") {
			return type === "txt" && (name.includes("_domainkey") || (nameHint.includes("_domainkey") && name === nameHint));
		}
		if (record === "dmarc") {
			return type === "txt" && (name.includes("_dmarc") || content.includes("v=dmarc1"));
		}
		return false;
	});
	if (matched.length) return matched;
	if (auditName) {
		const fallbackType = record === "mx" ? "MX" : "TXT";
		return [{ type: fallbackType, name: auditName, content: `(publish the ${record.toUpperCase()} record for this name at your DNS host)` }];
	}
	return [];
}

export function getDnsAuthStatusLabel(status: DnsAuthStatus): string {
	switch (status) {
		case "ok":
			return "found";
		case "missing":
			return "missing";
		default:
			return "not verified";
	}
}

export function getDnsAuthItemClass(status: DnsAuthStatus): string {
	switch (status) {
		case "ok":
			return "bg-green-50 text-green-800";
		case "missing":
			return "bg-red-50 text-red-800";
		default:
			return "bg-neutral-100 text-neutral-600";
	}
}

export async function checkDomain(hostname: string): Promise<DomainPreflightResponse> {
	const response = await authFetch("/api/domains/check", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ hostname }),
	});
	const data = (await response.json()) as Omit<DomainPreflightResponse, "ok">;
	return { ok: response.ok, ...data };
}
