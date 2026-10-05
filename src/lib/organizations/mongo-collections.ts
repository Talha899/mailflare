import type { Collection, Db } from "mongodb";
import type {
	DomainVerificationDocument,
	OrganizationDocument,
	OrgSettingsDocument,
} from "./types";

export const ORG_COLLECTIONS = {
	organizations: "organizations",
	domainVerifications: "domain_verifications",
	orgSettings: "org_settings",
} as const;

export const DEFAULT_ORG_LIMITS = {
	maxDomains: 5,
	maxMailboxes: 25,
} as const;

/** SaaS product: no practical domain/mailbox caps (enforcement hooks use these). */
export const SAAS_ORG_LIMITS = {
	maxDomains: 1_000_000,
	maxMailboxes: 10_000_000,
} as const;

export function organizationsCollection(db: Db): Collection<OrganizationDocument> {
	return db.collection<OrganizationDocument>(ORG_COLLECTIONS.organizations);
}

export function domainVerificationsCollection(db: Db): Collection<DomainVerificationDocument> {
	return db.collection<DomainVerificationDocument>(ORG_COLLECTIONS.domainVerifications);
}

export function orgSettingsCollection(db: Db): Collection<OrgSettingsDocument> {
	return db.collection<OrgSettingsDocument>(ORG_COLLECTIONS.orgSettings);
}

/** Create unique indexes once per process. Safe to call repeatedly. */
export async function ensureOrganizationIndexes(db: Db): Promise<void> {
	await Promise.all([
		organizationsCollection(db).createIndex({ slug: 1 }, { unique: true }),
		organizationsCollection(db).createIndex({ ownerUserId: 1 }),
		domainVerificationsCollection(db).createIndex(
			{ organizationId: 1, hostname: 1 },
			{ unique: true },
		),
		domainVerificationsCollection(db).createIndex({ status: 1, createdAt: 1 }),
		orgSettingsCollection(db).createIndex({ organizationId: 1 }, { unique: true }),
	]);
}
