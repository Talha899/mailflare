import { authFetch } from "@/lib/auth/client";
import type { DnsAuthStatus, DomainPreflightResponse } from "./types";
import { recordsForAuthCheck } from "./domain-dns-details-utils";

export const dnsAuthRecords = ["mx", "spf", "dkim", "dmarc"] as const;

export const dnsAuthDescriptions = {
	mx: "Routes incoming email to Postora",
	spf: "Authorizes Postora to send email",
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
