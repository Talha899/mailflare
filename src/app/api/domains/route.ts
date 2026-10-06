import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { requireSessionUser } from "@/lib/api/auth";
import { canManageDomains } from "@/lib/auth/admin";
import { addDomainSchema } from "@/lib/validators";
import { addDomainForUser, listOrganizationDomains } from "@/lib/domains/service";
import type { DnsStatusSummary } from "@/lib/dns-status";
import { summariseDomainDns } from "@/lib/domains/dns-view";
import { getDomainProvisioningError } from "@/lib/domains/errors";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";

export async function GET(request: NextRequest) {
	try {
		const env = getEnv();
		const auth = await requireSessionUser(env, request);
		if (auth.error) return auth.error;
		const user = auth.user;
		const domains = await listOrganizationDomains(env, user.organizationId);

		const includeDns = request.nextUrl.searchParams.get("includeDns") === "true";

		const dns: Record<string, DnsStatusSummary> = {};
		let domainViews = domains;
		if (includeDns) {
			const results = await Promise.allSettled(
				domains.map(async (domain) => {
					const { summary, sendingEnabled } = await summariseDomainDns(env, domain);
					return { id: domain.id, summary, sendingEnabled };
				}),
			);
			const sendingEnabledByDomain = new Map<string, boolean>();
			for (const r of results) {
				if (r.status === "fulfilled") {
					dns[r.value.id] = r.value.summary;
					sendingEnabledByDomain.set(r.value.id, r.value.sendingEnabled);
				}
			}
			domainViews = domains.map((domain) => ({
				...domain,
				sendingEnabled: sendingEnabledByDomain.get(domain.id) ?? domain.sendingEnabled,
			}));
		}

		return NextResponse.json({ domains: domainViews, dns: includeDns ? dns : undefined });
	} catch (error) {
		console.error("GET /api/domains", error);
		return NextResponse.json({ error: "Failed to load domains" }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const env = getEnv();
		const auth = await requireSessionUser(env, request);
		if (auth.error) return auth.error;
		const user = auth.user;
		if (!canManageDomains(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		if (!hasValidSessionMutationOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
		const parsed = addDomainSchema.safeParse(await request.json());
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
		}

		const result = await addDomainForUser(env, user.id, parsed.data.hostname, {
			enableRouting: parsed.data.enableRouting,
			enableSending: parsed.data.enableSending,
			replaceMxRecords: parsed.data.replaceMxRecords,
			organizationId: user.organizationId,
		});
		return NextResponse.json(result);
	} catch (err) {
		const failure = getDomainProvisioningError(err, "Failed to add domain");
		return NextResponse.json(
			{ error: failure.message, code: failure.code },
			{ status: failure.status },
		);
	}
}
