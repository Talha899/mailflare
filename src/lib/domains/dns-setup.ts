import type { DnsAuthRecord } from "@/lib/domains/dns-audit";
import type { DomainRow } from "@/lib/domains/types";

/**
 * Auto DNS setup via the Cloudflare API is disabled. Domains always use the
 * manual checklist on the domain DNS page.
 */
export async function setupDomainDnsRecord(
	_env: CloudflareEnv,
	_domain: DomainRow,
	_record: DnsAuthRecord,
): Promise<void> {
	throw new Error("DNS for this domain is managed manually");
}
