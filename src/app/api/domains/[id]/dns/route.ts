import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { requireUser } from "@/lib/auth/cookies";
import { getDomainForUser } from "@/lib/domains/service";
import { getDomainDnsView } from "@/lib/domains/dns-view";
import { getDomainOwnershipTxt } from "@/lib/domains/verification";
import { isManualZone } from "@/lib/domains/provision";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	const domain = await getDomainForUser(env, user.id, id);
	if (!domain) return NextResponse.json({ error: "Not found" }, { status: 404 });

	try {
		const dns = await getDomainDnsView(env, domain);
		const ownershipTxt =
			isManualZone(domain.zoneId) && domain.status === "pending"
				? await getDomainOwnershipTxt(env, {
						domainId: domain.id,
						organizationId: domain.organizationId ?? user.organizationId,
					})
				: null;
		return NextResponse.json({
			domain: { ...domain, sendingEnabled: dns.sendingEnabled },
			dns: { ...dns, ownershipTxt },
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to fetch DNS";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
