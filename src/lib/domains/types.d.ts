import type { domains } from "@/db/schema";

/** DNS checklist / zone record shape used by the domain DNS UI and audits. */
export type DnsRecord = {
	id?: string;
	type?: string;
	name?: string;
	content?: string;
	priority?: number;
	ttl?: number;
	proxied?: boolean;
	comment?: string;
	tags?: string[];
};

/**
 * Snapshot of what a provisioning attempt recorded. Provisioning is always
 * manual (`zoneId = "manual"`), so these fields stay empty / null — kept so
 * callers that still thread the object through remain typed.
 */
export type DomainProvisioningChanges = {
	zoneId: string;
	enabledEmailRouting: boolean;
	createdSendingSubdomainTag: string | null;
	previousCatchAll: null;
	createdAddressRules: string[];
	deletedMxRecords: DnsRecord[];
};

export type DomainProvisioningError = {
	message: string;
	code?: "MX_RECORDS_CONFLICT";
	status: number;
};

export type DomainProvisioningResult = {
	hostname: string;
	zone: { id: string; name: string };
	routingEnabled: boolean;
	sendingRequested: boolean;
	sendingEnabled: boolean;
	sendingSubdomainTag: string | null;
	routingStatus?: string;
	changes: DomainProvisioningChanges;
};

export type DomainPreflightResult = {
	hostname: string;
	zone: { id: string; name: string };
	/** cloudflare = legacy; manual = TXT/DNS checklist (always used now). */
	mode: "cloudflare" | "manual";
};

export type DomainRow = typeof domains.$inferSelect;
