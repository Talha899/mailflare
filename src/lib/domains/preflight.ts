import { assertDomainHostname } from "@/lib/domains/hostname";
import { MANUAL_ZONE_ID } from "@/lib/domains/provision";
import type { DomainPreflightResult } from "@/lib/domains/types";

/** Always manual — domains are never looked up or provisioned via the Cloudflare API. */
export async function preflightDomain(
	_env: CloudflareEnv,
	hostname: string,
): Promise<DomainPreflightResult> {
	const normalized = assertDomainHostname(hostname);
	return {
		hostname: normalized,
		zone: { id: MANUAL_ZONE_ID, name: normalized },
		mode: "manual",
	};
}
