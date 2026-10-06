import { authFetch } from "@/lib/auth/client";
import type { DnsAuthStatus, DomainPreflightResponse } from "./types";
import { recordsForAuthCheck } from "./domain-dns-details-utils";

export const dnsAuthRecords = ["mx", "spf", "dkim", "dmarc"] as const;

export const dnsAuthDescriptions = {
	mx: "Routes incoming email to Dispatch",
	spf: "Authorizes Dispatch to send email",
	dkim: "Signs outgoing email for deliverability",
	dmarc: "Helps prevent email spoofing",
} as const;

export { recordsForAuthCheck };

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
			return "bg-[var(--success)]/10 text-[var(--success)]";
		case "missing":
			return "bg-[var(--destructive)]/10 text-[var(--destructive)]";
		default:
			return "bg-[var(--muted)] text-[var(--muted-foreground)]";
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
