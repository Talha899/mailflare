import { desc, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { aiUsage } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";
import { requireSessionUser } from "@/lib/api/auth";
import { isInstanceOwner } from "@/lib/auth/admin";
import { getRequestTimeZone, recentZonedDays } from "@/lib/time/utils";

const PAGE_SIZE = 20;

function dayKeyFor(createdAt: Date, days: ReturnType<typeof recentZonedDays>): string | null {
	const time = createdAt.getTime();
	for (const day of days) {
		if (time >= day.start.getTime() && time < day.end.getTime()) return day.date;
	}
	return null;
}

export async function GET(request: Request) {
	try {
		const env = getEnv();
		const session = await requireSessionUser(env, request);
		if (session.error) return session.error;
		if (!isInstanceOwner(env, session.user)) return Response.json({ error: "Forbidden" }, { status: 403 });

		const rawPage = new URL(request.url).searchParams.get("page") ?? "1";
		const page = Number(rawPage);
		if (!Number.isSafeInteger(page) || page < 1 || page > Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE)) {
			return Response.json({ error: "Invalid page" }, { status: 400 });
		}

		const db = getDb(env);
		const [totals] = await db.select({
			requests: sql<number>`count(*)`,
			inputTokens: sql<number>`coalesce(sum(${aiUsage.inputTokens}), 0)`,
			outputTokens: sql<number>`coalesce(sum(${aiUsage.outputTokens}), 0)`,
			costUsdMicros: sql<number>`coalesce(sum(${aiUsage.costUsdMicros}), 0)`,
			pricedRequests: sql<number>`sum(case when ${aiUsage.costUsdMicros} is null then 0 else 1 end)`,
		}).from(aiUsage);

		const timeZone = getRequestTimeZone(request, session.user.timeZone);
		const days = recentZonedDays(timeZone, 30);
		const recent = await db
			.select({
				createdAt: aiUsage.createdAt,
				inputTokens: aiUsage.inputTokens,
				outputTokens: aiUsage.outputTokens,
			})
			.from(aiUsage)
			.where(gte(aiUsage.createdAt, days[0].start))
			.orderBy(desc(aiUsage.createdAt))
			.limit(50_000);

		const byDate = new Map<string, { date: string; requests: number; inputTokens: number; outputTokens: number }>();
		for (const day of days) {
			byDate.set(day.date, { date: day.date, requests: 0, inputTokens: 0, outputTokens: 0 });
		}
		for (const row of recent) {
			const key = dayKeyFor(row.createdAt, days);
			if (!key) continue;
			const bucket = byDate.get(key);
			if (!bucket) continue;
			bucket.requests += 1;
			bucket.inputTokens += row.inputTokens ?? 0;
			bucket.outputTokens += row.outputTokens ?? 0;
		}
		const daily = days.map(({ date }) => byDate.get(date)!);

		const rows = await db
			.select()
			.from(aiUsage)
			.orderBy(desc(aiUsage.createdAt), desc(aiUsage.id))
			.limit(PAGE_SIZE)
			.offset((page - 1) * PAGE_SIZE);

		const requestCount = Number(totals?.requests ?? 0);
		return Response.json(
			{
				totals: {
					requests: requestCount,
					inputTokens: Number(totals?.inputTokens ?? 0),
					outputTokens: Number(totals?.outputTokens ?? 0),
					costUsdMicros: Number(totals?.costUsdMicros ?? 0),
					pricedRequests: Number(totals?.pricedRequests ?? 0),
					totalTokens: Number(totals?.inputTokens ?? 0) + Number(totals?.outputTokens ?? 0),
				},
				daily,
				timeZone,
				rows,
				page,
				pageSize: PAGE_SIZE,
				totalPages: Math.max(1, Math.ceil(requestCount / PAGE_SIZE)),
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Could not load AI usage";
		// Missing table after deploy is the usual Coolify failure mode.
		if (/no such table:\s*ai_usage/i.test(message)) {
			return Response.json(
				{ error: "AI usage table is missing. Apply pending database migrations, then reload." },
				{ status: 503 },
			);
		}
		console.error("[ai-usage]", error);
		return Response.json({ error: message }, { status: 500 });
	}
}
