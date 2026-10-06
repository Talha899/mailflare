import type { DomainProvisioningResult } from "@/lib/domains/types";

/**
 * Zone id recorded for domains the app does not manage on Cloudflare.
 * Every Cloudflare call that receives it is a no-op, and the DNS page shows
 * records to set by hand (MX/SPF/DMARC for SMTP / Coolify installs).
 */
export const MANUAL_ZONE_ID = "manual";

export function isManualZone(zoneId: string | null | undefined): boolean {
	return zoneId === MANUAL_ZONE_ID;
}

/**
 * Catch-all Worker binding is never used — provisioning is always manual.
 * Kept for call sites that still reference the helper.
 */
export function shouldBindEmailCatchAllToWorker(
	_env?: Pick<CloudflareEnv, "MAILFLARE_RUNTIME">,
): boolean {
	return false;
}

/**
 * Record a domain without calling the Cloudflare Email Routing API.
 * The operator points MX (and related records) at this server themselves.
 */
export async function provisionDomainOnCloudflare(
	_env: CloudflareEnv,
	hostname: string,
	options?: { enableRouting?: boolean; enableSending?: boolean; replaceMxRecords?: boolean },
): Promise<DomainProvisioningResult> {
	const normalized = hostname.toLowerCase().trim();
	return {
		hostname: normalized,
		zone: { id: MANUAL_ZONE_ID, name: normalized },
		// Mail arrives whenever MX points at this server, so the domain is live at once.
		routingEnabled: options?.enableRouting ?? true,
		sendingRequested: options?.enableSending ?? true,
		sendingEnabled: false,
		sendingSubdomainTag: null,
		routingStatus: "manual",
		changes: {
			zoneId: MANUAL_ZONE_ID,
			enabledEmailRouting: false,
			createdSendingSubdomainTag: null,
			previousCatchAll: null,
			createdAddressRules: [],
			deletedMxRecords: [],
		},
	};
}
