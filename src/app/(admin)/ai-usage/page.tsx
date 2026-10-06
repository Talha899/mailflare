"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AiUsageResponse } from "./types";
import { fetchAiUsage, formatEstimatedUsd, formatTokenCount, formatUsageDate, formatUsageProvider } from "./utils";
import { UsageChart } from "./usage-chart";

export default function AiUsagePage() {
	const [data, setData] = useState<AiUsageResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loadingPage, setLoadingPage] = useState(false);

	useEffect(() => {
		let active = true;
		void fetchAiUsage(1).then((result) => { if (active) setData(result); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load AI usage"); });
		return () => { active = false; };
	}, []);

	const totals = data?.totals;
	return <div className="space-y-6">
		<div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">AI Usage</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Requests recorded since usage tracking was added.</p></div><Link href="/agent" className="shrink-0 text-sm font-medium text-[var(--compose)] hover:underline">Back to Agent</Link></div>
		{error && <p role="alert" className="text-sm text-[var(--destructive)]">{error}</p>}
		<div className="grid gap-4 sm:grid-cols-3">
			<section className="rounded-2xl bg-[var(--card)] p-5"><p className="text-sm text-[var(--muted-foreground)]">Total tokens</p><p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{totals ? formatTokenCount(totals.totalTokens) : "—"}</p></section>
			<section className="rounded-2xl bg-[var(--card)] p-5"><p className="text-sm text-[var(--muted-foreground)]">Total requests</p><p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{totals ? formatTokenCount(totals.requests) : "—"}</p></section>
			<section className="rounded-2xl bg-[var(--card)] p-5"><p className="text-sm text-[var(--muted-foreground)]">Estimated spend</p><p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{totals && totals.pricedRequests ? formatEstimatedUsd(totals.costUsdMicros) : "—"}</p>{totals && totals.pricedRequests < totals.requests && <p className="mt-1 text-xs text-[var(--muted-foreground)]">{formatTokenCount(totals.requests - totals.pricedRequests)} requests have no rate.</p>}</section>
		</div>
		<UsageChart daily={data?.daily ?? []} timeZone={data?.timeZone} />
		<section className="overflow-x-auto rounded-2xl bg-[var(--card)]" aria-busy={loadingPage}><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-[var(--border)] bg-[var(--muted)] text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]"><tr><th className="px-4 py-3">Date & time</th><th className="px-4 py-3">Model</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3 text-right">Input tokens</th><th className="px-4 py-3 text-right">Output tokens</th><th className="px-4 py-3 text-right">Spending</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{data?.rows.map((row) => <tr key={row.id}><td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)]">{formatUsageDate(row.createdAt)}</td><td className="max-w-56 break-all px-4 py-3">{row.model}</td><td className="px-4 py-3">{formatUsageProvider(row.provider)}</td><td className="px-4 py-3 text-right tabular-nums">{formatTokenCount(row.inputTokens)}</td><td className="px-4 py-3 text-right tabular-nums">{formatTokenCount(row.outputTokens)}</td><td className="px-4 py-3 text-right tabular-nums">{formatEstimatedUsd(row.costUsdMicros)}</td></tr>)}{data && data.rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">No AI usage recorded yet.</td></tr>}{!data && !error && <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">Loading usage…</td></tr>}</tbody></table></section>
		{data && <div className="flex items-center justify-end gap-3 text-sm text-[var(--muted-foreground)]"><span>Page {data.page} of {data.totalPages} · {data.pageSize} per page</span><Button type="button" variant="outline" size="sm" disabled={loadingPage || data.page <= 1} onClick={() => { setLoadingPage(true); setError(null); void fetchAiUsage(data.page - 1).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load usage page")).finally(() => setLoadingPage(false)); }}>Previous</Button><Button type="button" variant="outline" size="sm" disabled={loadingPage || data.page >= data.totalPages} onClick={() => { setLoadingPage(true); setError(null); void fetchAiUsage(data.page + 1).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load usage page")).finally(() => setLoadingPage(false)); }}>Next</Button></div>}
		<p className="text-xs text-[var(--muted-foreground)]">Spending is estimated from the per-model rates saved in Agent settings. A dash means no rate or token count was available.</p>
	</div>;
}
