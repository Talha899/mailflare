import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { domains } from "@/db/schema";
import { queryDns } from "@/lib/dns-query";
import {
	getDomainVerification,
	markDomainVerified,
	verificationTxtRecord,
} from "@/lib/organizations/service";
import { isManualZone } from "@/lib/domains/provision";

export type DomainVerificationResult = {
	verified: boolean;
	hostname: string;
	expected: { type: "TXT"; name: string; content: string } | null;
	found: string[];
	status: "pending" | "verified" | "expired" | "active" | "missing";
};

/**
 * Check public DNS for the Mailflare ownership TXT, then activate the domain
 * when the token is present. Cloudflare-managed domains are already active.
 */
export async function verifyDomainOwnership(
	env: CloudflareEnv,
	input: { domainId: string; organizationId: string },
): Promise<DomainVerificationResult> {
	const db = getDb(env);
	const [domain] = await db
		.select()
		.from(domains)
		.where(and(eq(domains.id, input.domainId), eq(domains.organizationId, input.organizationId)))
		.limit(1);
	if (!domain) throw new Error("Domain not found");

	if (!isManualZone(domain.zoneId) && domain.status === "active") {
		return {
			verified: true,
			hostname: domain.hostname,
			expected: null,
			found: [],
			status: "active",
		};
	}

	const verification = await getDomainVerification(env, domain.id);
	if (!verification) {
		return {
			verified: domain.status === "active",
			hostname: domain.hostname,
			expected: null,
			found: [],
			status: domain.status === "active" ? "active" : "missing",
		};
	}

	const expected = verificationTxtRecord(verification.hostname, verification.token);
	let found: string[] = [];
	try {
		found = await queryDns(expected.name, "TXT");
	} catch {
		return {
			verified: false,
			hostname: domain.hostname,
			expected,
			found: [],
			status: "pending",
		};
	}

	const matched = found.some((value) => value.includes(expected.content) || value.includes(verification.token));
	if (!matched) {
		return {
			verified: false,
			hostname: domain.hostname,
			expected,
			found,
			status: verification.status === "expired" ? "expired" : "pending",
		};
	}

	await markDomainVerified(env, domain.id);
	const mailerReady = !!(env.EMAIL as unknown as { configured?: boolean })?.configured;
	await db
		.update(domains)
		.set({
			status: "active",
			routingEnabled: true,
			...(mailerReady && domain.sendingRequested ? { sendingEnabled: true } : {}),
		})
		.where(eq(domains.id, domain.id));

	return {
		verified: true,
		hostname: domain.hostname,
		expected,
		found,
		status: "verified",
	};
}
