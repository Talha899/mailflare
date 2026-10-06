import { eq, and, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { domains, mailboxes, users } from "@/db/schema";
import { ensureMailboxDomainRouting } from "@/lib/mailboxes/domain-addresses";
import { newId } from "@/lib/ids";
import { isManualZone, MANUAL_ZONE_ID, provisionDomainOnCloudflare } from "@/lib/domains/provision";
import { getManualDomainDns } from "@/lib/domains/manual-dns";
import { assertDomainHostname, normalizeDomainHostname, isValidDomainHostname } from "@/lib/domains/hostname";
import type { DnsRecord, DomainProvisioningChanges } from "@/lib/domains/types";
import { syncOutboundSenderDomains } from "@/lib/outbound/sender-domains";
import {
	createDomainVerification,
	isSaasMode,
	verificationTxtRecord,
} from "@/lib/organizations/service";

export type DomainDnsView = {
	routing: { records: DnsRecord[]; missing: DnsRecord[]; status?: string };
	sending: DnsRecord[];
	sendingEnabled: boolean;
	/** DKIM selector used for outbound signing when Postfix/SMTP is configured. */
	dkimSelector?: string;
	/** Legacy sending-subdomain hint; unused when provisioning is manual. */
	sendingSubdomain?: { name: string; tag: string };
};

export async function listUserDomains(env: CloudflareEnv, userId: string) {
	const db = getDb(env);
	const [owner] = await db.select({ organizationId: users.organizationId }).from(users).where(eq(users.id, userId)).limit(1);
	const rows = owner?.organizationId
		? await db.select().from(domains).where(eq(domains.organizationId, owner.organizationId))
		: await db.select().from(domains).where(eq(domains.userId, userId));
	return Promise.all(rows.map((row) => repairDomainHostnameIfNeeded(env, row)));
}

export async function listOrganizationDomains(env: CloudflareEnv, organizationId: string) {
	const db = getDb(env);
	const rows = await db.select().from(domains).where(eq(domains.organizationId, organizationId));
	return Promise.all(rows.map((row) => repairDomainHostnameIfNeeded(env, row)));
}

export async function addDomainForUser(
	env: CloudflareEnv,
	userId: string,
	hostname: string,
	options?: { enableRouting?: boolean; enableSending?: boolean; replaceMxRecords?: boolean; organizationId?: string },
): Promise<{
	domain: typeof domains.$inferSelect;
	dns: DomainDnsView;
	changes: DomainProvisioningChanges;
	verification?: { type: "TXT"; name: string; content: string };
}> {
	const db = getDb(env);
	const [owner] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
	const organizationId = options?.organizationId ?? owner?.organizationId ?? "org_default";

	const normalizedHostname = assertDomainHostname(hostname);
	if (isSaasMode(env) && !env.MONGO) {
		throw new Error("MongoDB is required for SaaS domain verification. Set MONGO_URL and restart.");
	}
	const [claimedHostname] = await db
		.select({ userId: domains.userId, organizationId: domains.organizationId })
		.from(domains)
		.where(eq(domains.hostname, normalizedHostname))
		.limit(1);
	if (claimedHostname && claimedHostname.organizationId !== organizationId) {
		throw new Error("Domain is already registered");
	}

	// Always manual — no Cloudflare Email Routing / zone API.
	const effectiveProvisioned = await provisionDomainOnCloudflare(env, hostname, options);

	let insertedDomainId: string | null = null;
	let domain: typeof domains.$inferSelect;
	let verificationRecord: { type: "TXT"; name: string; content: string } | undefined;

	try {
		const [existing] = await db.select().from(domains).where(eq(domains.hostname, effectiveProvisioned.hostname)).limit(1);
		if (existing && existing.organizationId !== organizationId) {
			throw new Error("Domain is already registered");
		}

		const domainId = existing?.id ?? newId("dom");
		const isManual = isManualZone(effectiveProvisioned.zone.id);
		const requiresTxtProof = isManual && isSaasMode(env);
		const values = {
			id: domainId,
			userId,
			organizationId,
			hostname: effectiveProvisioned.hostname,
			zoneId: MANUAL_ZONE_ID,
			status: requiresTxtProof
				? ("pending" as const)
				: effectiveProvisioned.routingEnabled || effectiveProvisioned.sendingEnabled || isManual
					? ("active" as const)
					: ("pending" as const),
			routingStatus: effectiveProvisioned.routingStatus ?? null,
			sendingSubdomainTag: effectiveProvisioned.sendingSubdomainTag,
			sendingRequested: effectiveProvisioned.sendingRequested,
			// Node mailer is ready for outbound even without Cloudflare Email Sending;
			// the operator still must publish SPF+DKIM (or use SMTP_URL / Postfix).
			sendingEnabled:
				effectiveProvisioned.sendingEnabled ||
				((options?.enableSending ?? true) &&
					!!(env.EMAIL as unknown as { configured?: boolean })?.configured),
			routingEnabled: requiresTxtProof ? false : (effectiveProvisioned.routingEnabled || isManual),
		};

		if (existing) {
			await db.update(domains).set(values).where(eq(domains.id, domainId));
		} else {
			await db.insert(domains).values(values);
			insertedDomainId = domainId;
		}

		if (requiresTxtProof && env.MONGO) {
			const verification = await createDomainVerification(env, {
				organizationId,
				domainId,
				hostname: effectiveProvisioned.hostname,
			});
			verificationRecord = verificationTxtRecord(verification.hostname, verification.token);
		}

		const aliasMailboxes = await db
			.select({
				id: mailboxes.id,
				domainId: mailboxes.domainId,
				localPart: mailboxes.localPart,
				useAllDomains: mailboxes.useAllDomains,
				organizationId: mailboxes.organizationId,
			})
			.from(mailboxes)
			.innerJoin(domains, eq(mailboxes.domainId, domains.id))
			.where(and(eq(domains.organizationId, organizationId), eq(mailboxes.useAllDomains, true)));
		const routingResults = await Promise.allSettled(
			aliasMailboxes.map((mailbox) => ensureMailboxDomainRouting(env, db, mailbox)),
		);
		for (const result of routingResults) {
			if (result.status === "rejected") console.warn("ensureMailboxDomainRouting", result.reason);
		}

		const [row] = await db.select().from(domains).where(eq(domains.id, domainId)).limit(1);
		domain = row!;
	} catch (err) {
		if (insertedDomainId) {
			try {
				await db.delete(domains).where(eq(domains.id, insertedDomainId));
			} catch (cleanupError) {
				console.warn("addDomainForUser: failed to remove partial domain row", cleanupError);
			}
		}
		throw err;
	}

	let dns: DomainDnsView;
	try {
		dns = await getDomainDns(env, domain);
		if (verificationRecord) {
			dns = {
				...dns,
				routing: {
					...dns.routing,
					missing: [
						{
							type: verificationRecord.type,
							name: verificationRecord.name,
							content: verificationRecord.content,
							ttl: 3600,
						},
						...dns.routing.missing,
					],
				},
			};
		}
	} catch (error) {
		console.warn("addDomainForUser: failed to read DNS status after provisioning", error);
		dns = {
			routing: { records: [], missing: [], status: effectiveProvisioned.routingStatus },
			sending: [],
			sendingEnabled: effectiveProvisioned.sendingEnabled,
		};
	}
	await syncOutboundSenderDomains(env);
	return { domain, dns, changes: effectiveProvisioned.changes, verification: verificationRecord };
}

/** Alias used by SaaS org-scoped callers. */
export async function addDomainForOrganization(
	env: CloudflareEnv,
	input: {
		userId: string;
		organizationId: string;
		hostname: string;
		enableRouting?: boolean;
		enableSending?: boolean;
		replaceMxRecords?: boolean;
	},
) {
	return addDomainForUser(env, input.userId, input.hostname, {
		enableRouting: input.enableRouting,
		enableSending: input.enableSending,
		replaceMxRecords: input.replaceMxRecords,
		organizationId: input.organizationId,
	});
}

/**
 * Fix rows stored as URLs (e.g. https://codenak.com/) from older UI pastes.
 * Returns the repaired domain row.
 */
export async function repairDomainHostnameIfNeeded(
	env: CloudflareEnv,
	domain: typeof domains.$inferSelect,
): Promise<typeof domains.$inferSelect> {
	const normalized = normalizeDomainHostname(domain.hostname);
	if (!normalized || normalized === domain.hostname || !isValidDomainHostname(normalized)) {
		return domain;
	}
	const db = getDb(env);
	const [conflict] = await db
		.select({ id: domains.id })
		.from(domains)
		.where(and(eq(domains.hostname, normalized), ne(domains.id, domain.id)))
		.limit(1);
	if (conflict) {
		console.warn(`repairDomainHostnameIfNeeded: skip ${domain.hostname} → ${normalized} (conflict)`);
		return domain;
	}
	await db.update(domains).set({ hostname: normalized }).where(eq(domains.id, domain.id));
	await syncOutboundSenderDomains(env);
	return { ...domain, hostname: normalized };
}

export async function getDomainDns(
	env: CloudflareEnv,
	domain: typeof domains.$inferSelect,
): Promise<DomainDnsView> {
	domain = await repairDomainHostnameIfNeeded(env, domain);
	// Always show the hand-managed DNS checklist — no Cloudflare zone reads.
	return getManualDomainDns(env, domain.hostname);
}

export async function removeDomainForUser(
	env: CloudflareEnv,
	userId: string,
	domainId: string,
): Promise<void> {
	const db = getDb(env);
	const [owner] = await db.select({ organizationId: users.organizationId }).from(users).where(eq(users.id, userId)).limit(1);
	const [domain] = await db
		.select()
		.from(domains)
		.where(and(
			eq(domains.id, domainId),
			owner?.organizationId
				? eq(domains.organizationId, owner.organizationId)
				: eq(domains.userId, userId),
		))
		.limit(1);
	if (!domain) throw new Error("Domain not found");

	await db.delete(domains).where(eq(domains.id, domainId));
	await syncOutboundSenderDomains(env);
}

export async function getDomainForUser(env: CloudflareEnv, userId: string, domainId: string) {
	const db = getDb(env);
	const [domain] = await db
		.select()
		.from(domains)
		.where(and(eq(domains.id, domainId), eq(domains.userId, userId)))
		.limit(1);
	return domain ?? null;
}
