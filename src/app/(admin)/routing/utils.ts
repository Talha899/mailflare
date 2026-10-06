import { authFetch } from "@/lib/auth/client";
import type { AdminRoutingDomainsResponse } from "./types";

export async function fetchAdminRoutingDomains(): Promise<AdminRoutingDomainsResponse> {
	const response = await authFetch("/api/domains");
	const text = await response.text();
	let data: AdminRoutingDomainsResponse & { error?: string } = { domains: [] };
	try {
		data = text ? (JSON.parse(text) as AdminRoutingDomainsResponse & { error?: string }) : data;
	} catch {
		throw new Error(
			response.ok
				? "Unable to load domains"
				: `Unable to load domains (${response.status})`,
		);
	}
	if (!response.ok) throw new Error(data.error ?? `Unable to load domains (${response.status})`);
	return { domains: data.domains ?? [] };
}
