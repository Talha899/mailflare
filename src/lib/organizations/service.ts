import type { Db } from "mongodb";
import { newId } from "@/lib/ids";
import { isSaasModeEnabled } from "@/lib/runtime";
import {
	DEFAULT_ORG_LIMITS,
	SAAS_ORG_LIMITS,
	domainVerificationsCollection,
	organizationsCollection,
	orgSettingsCollection,
} from "./mongo-collections";
import type {
	DomainVerificationDocument,
	OrganizationDocument,
	OrgLimits,
	OrgSettingsDocument,
} from "./types";

export function isSaasMode(env?: Pick<CloudflareEnv, "SAAS_MODE">): boolean {
	return isSaasModeEnabled(env);
}

export function requireMongo(env: CloudflareEnv): Db {
	if (!env.MONGO) {
		throw new Error("MongoDB is not configured. Set MONGO_URL for SaaS multi-org mode.");
	}
	return env.MONGO;
}

function slugify(name: string): string {
	const base = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
	return base || "org";
}

export async function createOrganization(
	env: CloudflareEnv,
	input: { name: string; ownerUserId: string; slug?: string },
): Promise<OrganizationDocument> {
	const db = requireMongo(env);
	const id = newId("org");
	let slug = input.slug?.trim() || slugify(input.name);
	const existing = await organizationsCollection(db).findOne({ slug });
	if (existing) slug = `${slug}-${id.slice(-6).toLowerCase()}`;

	const doc: OrganizationDocument = {
		_id: id,
		slug,
		name: input.name.trim(),
		ownerUserId: input.ownerUserId,
		createdAt: new Date(),
		plan: "free",
		limits: { ...SAAS_ORG_LIMITS },
	};
	await organizationsCollection(db).insertOne(doc);
	const settings: OrgSettingsDocument = {
		_id: newId("ogs"),
		organizationId: id,
		displayName: input.name.trim(),
		updatedAt: new Date(),
	};
	await orgSettingsCollection(db).insertOne(settings);
	return doc;
}

export async function getOrganization(
	env: CloudflareEnv,
	organizationId: string,
): Promise<OrganizationDocument | null> {
	const db = requireMongo(env);
	return organizationsCollection(db).findOne({ _id: organizationId });
}

export async function getOrganizationLimits(
	env: CloudflareEnv,
	organizationId: string,
): Promise<OrgLimits> {
	if (!isSaasMode(env) || !env.MONGO) return { ...DEFAULT_ORG_LIMITS };
	const org = await getOrganization(env, organizationId);
	// Prefer stored limits, but never cap SaaS below the product defaults.
	const limits = org?.limits ?? { ...SAAS_ORG_LIMITS };
	return {
		maxDomains: Math.max(limits.maxDomains, SAAS_ORG_LIMITS.maxDomains),
		maxMailboxes: Math.max(limits.maxMailboxes, SAAS_ORG_LIMITS.maxMailboxes),
	};
}

export async function createDomainVerification(
	env: CloudflareEnv,
	input: { organizationId: string; domainId: string; hostname: string },
): Promise<DomainVerificationDocument> {
	const db = requireMongo(env);
	const token = newId("vfy").replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
	const hostname = input.hostname.toLowerCase().trim();
	const now = new Date();
	// Upsert without touching _id: replaceOne with a new _id fails on retries
	// ("immutable field '_id' was found to have been altered").
	const result = await domainVerificationsCollection(db).findOneAndUpdate(
		{ organizationId: input.organizationId, hostname },
		{
			$set: {
				organizationId: input.organizationId,
				domainId: input.domainId,
				hostname,
				token,
				status: "pending" as const,
				verifiedAt: null,
			},
			$setOnInsert: {
				_id: newId("dvf"),
				createdAt: now,
			},
		},
		{ upsert: true, returnDocument: "after" },
	);
	if (!result) {
		throw new Error("Failed to create domain verification");
	}
	return result;
}

export async function getDomainVerification(
	env: CloudflareEnv,
	domainId: string,
): Promise<DomainVerificationDocument | null> {
	if (!env.MONGO) return null;
	return domainVerificationsCollection(env.MONGO).findOne({ domainId });
}

export async function markDomainVerified(
	env: CloudflareEnv,
	domainId: string,
): Promise<void> {
	const db = requireMongo(env);
	await domainVerificationsCollection(db).updateOne(
		{ domainId },
		{ $set: { status: "verified", verifiedAt: new Date() } },
	);
}

export function verificationTxtRecord(hostname: string, token: string): {
	type: "TXT";
	name: string;
	content: string;
} {
	return {
		type: "TXT",
		name: `_mailflare-verify.${hostname}`,
		content: `mailflare-verification=${token}`,
	};
}

/** Export all SaaS collections for backup alongside SQLite dumps. */
export async function exportMongoTenantData(env: CloudflareEnv): Promise<{
	organizations: OrganizationDocument[];
	domain_verifications: DomainVerificationDocument[];
	org_settings: OrgSettingsDocument[];
} | null> {
	if (!env.MONGO) return null;
	const db = env.MONGO;
	const [organizations, domain_verifications, org_settings] = await Promise.all([
		organizationsCollection(db).find().toArray(),
		domainVerificationsCollection(db).find().toArray(),
		orgSettingsCollection(db).find().toArray(),
	]);
	return { organizations, domain_verifications, org_settings };
}
