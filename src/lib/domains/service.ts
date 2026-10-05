import { eq, and, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { domains, mailboxes, users } from "@/db/schema";
import { ensureMailboxDomainRouting } from "@/lib/mailboxes/domain-addresses";
import { newId } from "@/lib/ids";
import {
	disableEmailRouting,
	getEmailRoutingDns,
	getEmailRoutingSettings,
	getSendingSubdomainDns,
	deleteSendingSubdomain,
	listSendingSubdomains,
	type CfDnsRecord,
} from "@/lib/cloudflare-api";
import { deleteEmailRoutingRulesForDomain } from "@/lib/domains/cloudflare-cleanup";
import { isManualZone, provisionDomainOnCloudflare } from "@/lib/domains/provision";
import { getManualDomainDns } from "@/lib/domains/manual-dns";
import { rollbackDomainProvisioning } from "@/lib/domains/rollback";
import type { DomainProvisioningChanges } from "@/lib/domains/types";
import { findSendingSubdomain } from "@/lib/domains/sending-status";
import { preflightDomain } from "@/lib/domains/preflight";
import { hasCloudflareCredentials } from "@/lib/runtime";
import {
	createDomainVerification,
	isSaasMode,
	verificationTxtRecord,
} from "@/lib/organizations/service";

export type DomainDnsView = {
	routing: { records: CfDnsRecord[]; missing: CfDnsRecord[]; status?: string };
	sending: CfDnsRecord[];
	sendingEnabled: boolean;
	/** DKIM selector Cloudflare signs with, when a sending subdomain exists. */
	dkimSelector?: string;
	/** The matching sending subdomain, when the zone has the domain added for sending. */
	sendingSubdomain?: { name: string; tag: string };
};

export async function listUserDomains(env: CloudflareEnv, userId: string) {
	const db = getDb(env);
	const [owner] = await db.select({ organizationId: users.organizationId }).from(users).where(eq(users.id, userId)).limit(1);
	if (owner?.organizationId) {
		return db.select().from(domains).where(eq(domains.organizationId, owner.organizationId));
	}
	return db.select().from(domains).where(eq(domains.userId, userId));
}

export async function listOrganizationDomains(env: CloudflareEnv, organizationId: string) {
	const db = getDb(env);
	return db.select().from(domains).where(eq(domains.organizationId, organizationId));
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

	const normalizedHostname = hostname.toLowerCase().trim();
	const [claimedHostname] = await db
		.select({ userId: domains.userId, organizationId: domains.organizationId })
		.from(domains)
		.where(eq(domains.hostname, normalizedHostname))
		.limit(1);
	if (claimedHostname && claimedHostname.organizationId !== organizationId) {
		throw new Error("Domain is already registered");
	}

	let useCloudflare = false;
	if (hasCloudflareCredentials(env)) {
		try {
			const preflight = await preflightDomain(env, normalizedHostname);
			// Manual / off-account domains share zoneId "manual" — never treat that as a unique CF zone claim.
			if (preflight.mode === "manual" || isManualZone(preflight.zone.id)) {
				useCloudflare = false;
			} else {
				const [claimedZone] = await db
					.select({ userId: domains.userId, organizationId: domains.organizationId })
					.from(domains)
					.where(and(eq(domains.zoneId, preflight.zone.id), ne(domains.organizationId, organizationId)))
					.limit(1);
				if (claimedZone) {
					throw new Error("Cloudflare zone is already registered to another organization");
				}
				useCloudflare = true;
			}
		} catch (error) {
			// Dual path C: fall back to manual TXT verification when the zone is not on this CF account.
			if (isSaasMode(env) && error instanceof Error && /Zone not found/i.test(error.message)) {
				useCloudflare = false;
			} else {
				throw error;
			}
		}
	}

	const manualProvisioned = {
		hostname: normalizedHostname,
		zone: { id: "manual", name: normalizedHostname },
		routingEnabled: false,
		sendingRequested: options?.enableSending ?? true,
		// Node mailer is ready for outbound even when the zone is not on our CF account;
		// the operator still must onboard the domain in CF Email Sending / publish SPF+DKIM.
		sendingEnabled:
			(options?.enableSending ?? true) &&
			!!(env.EMAIL as unknown as { configured?: boolean })?.configured,
		sendingSubdomainTag: null as string | null,
		routingStatus: "manual",
		changes: {
			zoneId: "manual",
			enabledEmailRouting: false,
			createdSendingSubdomainTag: null,
			previousCatchAll: null,
			createdAddressRules: [] as string[],
			deletedMxRecords: [] as Array<{ id: string; name: string; type: string; content: string; priority?: number; ttl?: number }>,
		} satisfies DomainProvisioningChanges,
	};

	const effectiveProvisioned = useCloudflare
		? await provisionDomainOnCloudflare(env, hostname, options)
		: !hasCloudflareCredentials(env)
			? await provisionDomainOnCloudflare(env, hostname, options)
			: manualProvisioned;

	const forceManual = isManualZone(effectiveProvisioned.zone.id);

	let insertedDomainId: string | null = null;
	let domain: typeof domains.$inferSelect;
	let verificationRecord: { type: "TXT"; name: string; content: string } | undefined;

	try {
		const [existing] = await db.select().from(domains).where(eq(domains.hostname, effectiveProvisioned.hostname)).limit(1);
		if (existing && existing.organizationId !== organizationId) {
			throw new Error("Domain is already registered");
		}

		const domainId = existing?.id ?? newId("dom");
		const isManual = forceManual;
		const requiresTxtProof = isManual && isSaasMode(env);
		const values = {
			id: domainId,
			userId,
			organizationId,
			hostname: effectiveProvisioned.hostname,
			zoneId: isManual ? "manual" : effectiveProvisioned.zone.id,
			status: requiresTxtProof
				? ("pending" as const)
				: effectiveProvisioned.routingEnabled || effectiveProvisioned.sendingEnabled || isManual
					? ("active" as const)
					: ("pending" as const),
			routingStatus: effectiveProvisioned.routingStatus ?? null,
			sendingSubdomainTag: effectiveProvisioned.sendingSubdomainTag,
			sendingRequested: effectiveProvisioned.sendingRequested,
			sendingEnabled: effectiveProvisioned.sendingEnabled,
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
		if (useCloudflare) await rollbackDomainProvisioning(env, effectiveProvisioned.changes);
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

export async function getDomainDns(
	env: CloudflareEnv,
	domain: typeof domains.$inferSelect,
): Promise<DomainDnsView> {
	if (isManualZone(domain.zoneId)) return getManualDomainDns(env, domain.hostname);
	// Read the zone's actual sending state rather than trusting `sendingRequested`,
	// which goes stale when sending is enabled outside Mailflare (or when the row
	// was written before the subdomain existed). A missing Email Sending permission
	// must not take down the routing/DNS view, so a failed list degrades to none.
	const [routingDns, routingSettings, sendingSubdomains] = await Promise.all([
		getEmailRoutingDns(env, domain.zoneId),
		getEmailRoutingSettings(env, domain.zoneId),
		listSendingSubdomains(env, domain.zoneId).catch((error) => {
			console.warn("getDomainDns: failed to list sending subdomains", error);
			return [];
		}),
	]);
	const sendingSubdomain = findSendingSubdomain(domain.hostname, sendingSubdomains);
	let sending: CfDnsRecord[] = [];
	if (sendingSubdomain?.tag) {
		sending = await getSendingSubdomainDns(env, domain.zoneId, sendingSubdomain.tag).catch(
			(error) => {
				console.warn("getDomainDns: failed to read sending subdomain DNS", error);
				return [];
			},
		);
	}
	return {
		routing: {
			records: routingDns.records,
			missing: routingDns.missing,
			status: routingSettings.status,
		},
		sending,
		sendingEnabled: sendingSubdomain?.enabled ?? false,
		dkimSelector: sendingSubdomain?.dkim_selector,
		sendingSubdomain: sendingSubdomain
			? { name: sendingSubdomain.name, tag: sendingSubdomain.tag }
			: undefined,
	};
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

	try {
		await deleteEmailRoutingRulesForDomain(env, domain.zoneId, domain.hostname);
	} catch (err) {
		console.warn("deleteEmailRoutingRulesForDomain", err);
	}

	const [otherDomainOnZone] = await db.select({ id: domains.id }).from(domains).where(and(
		eq(domains.zoneId, domain.zoneId),
		ne(domains.id, domainId),
	)).limit(1);
	if (domain.routingEnabled && !otherDomainOnZone) {
		try {
			await disableEmailRouting(env, domain.zoneId);
		} catch (err) {
			console.warn("disableEmailRouting", err);
		}
	}

	if (domain.sendingSubdomainTag) {
		try {
			await deleteSendingSubdomain(env, domain.zoneId, domain.sendingSubdomainTag);
		} catch (err) {
			console.warn("deleteSendingSubdomain", err);
		}
	}

	await db.delete(domains).where(eq(domains.id, domainId));
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
