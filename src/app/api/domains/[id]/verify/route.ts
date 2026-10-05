import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { requireUser } from "@/lib/auth/cookies";
import { canManageDomains } from "@/lib/auth/admin";
import { verifyDomainOwnership } from "@/lib/domains/verification";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";

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

export async function GET(request: Request, { params }: Params) {
	const env = getEnv();
	const user = await requireUser(env, request);
	if (!canManageDomains(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
