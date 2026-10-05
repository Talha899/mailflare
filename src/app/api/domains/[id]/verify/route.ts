import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { requireUser } from "@/lib/auth/cookies";
import { canManageDomains } from "@/lib/auth/admin";
import { getDomainOwnershipTxt, verifyDomainOwnership } from "@/lib/domains/verification";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { getDomainForUser } from "@/lib/domains/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
	const env = getEnv();
	const user = await requireUser(env, request);
	if (!canManageDomains(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	if (!hasValidSessionMutationOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });

	const { id } = await params;
	try {
		const result = await verifyDomainOwnership(env, {
			domainId: id,
			organizationId: user.organizationId,
		});
		return NextResponse.json(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Verification failed";
		const status = message === "Domain not found" ? 404 : 502;
		return NextResponse.json({ error: message }, { status });
	}
}

/** Returns the expected ownership TXT without checking DNS or activating the domain. */
export async function GET(request: Request, { params }: Params) {
	const env = getEnv();
	const user = await requireUser(env, request);
	if (!canManageDomains(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

	const { id } = await params;
	const domain = await getDomainForUser(env, user.id, id);
	if (!domain) return NextResponse.json({ error: "Domain not found" }, { status: 404 });

	const expected = await getDomainOwnershipTxt(env, {
		domainId: domain.id,
		organizationId: domain.organizationId ?? user.organizationId,
	});
	return NextResponse.json({
		verified: domain.status === "active",
		hostname: domain.hostname,
		expected,
		status: domain.status === "active" ? "active" : expected ? "pending" : "missing",
	});
}
