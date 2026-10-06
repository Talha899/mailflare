import type { UsageChartProps } from "./types";
import { fillDailyUsage, formatDailyLabel, formatTokenCount } from "./utils";
import { getUserTimeZone } from "@/lib/time/utils";

export function UsageChart({ daily, timeZone = getUserTimeZone() }: UsageChartProps) {
	const days = daily.length ? daily : fillDailyUsage([], timeZone);
	const maxTokens = Math.max(0, ...days.map((day) => day.inputTokens + day.outputTokens));

	return <section className="rounded-2xl bg-[var(--card)] p-5">
		<div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-[var(--foreground)]">Usage by day</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Input and output tokens over the last 30 days ({timeZone})</p></div><div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--compose)]" /> Input</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--accent)]" /> Output</span></div></div>
		<div className="mt-5 flex gap-3" role="img" aria-label="Daily AI token usage for the last 30 days">
			<div className="flex h-48 flex-col justify-between pb-5 text-right text-[10px] text-[var(--muted-foreground)]"><span>{formatTokenCount(maxTokens)}</span><span>0</span></div>
			<div className="flex min-w-0 flex-1 items-end gap-1 border-b border-[var(--border)]">
				{days.map((day, index) => {
					const total = day.inputTokens + day.outputTokens;
					return <div key={day.date} className="flex h-48 min-w-0 flex-1 flex-col items-center" title={`${formatDailyLabel(day.date)}: ${formatTokenCount(total)} tokens, ${formatTokenCount(day.requests)} requests`}>
						<div className="flex h-[172px] w-full items-end justify-center"><div className="relative w-full max-w-5 rounded-t-sm" style={{ height: `${total ? Math.max(2, total / maxTokens * 100) : 0}%` }}><div className="absolute inset-x-0 bottom-0 bg-[var(--compose)]" style={{ height: `${total ? day.inputTokens / total * 100 : 0}%` }} /><div className="absolute inset-x-0 top-0 bg-[var(--accent)]" style={{ height: `${total ? day.outputTokens / total * 100 : 0}%` }} /></div></div>
						<span className="h-5 whitespace-nowrap pt-1 text-[9px] text-[var(--muted-foreground)]">{index % 5 === 0 || index === days.length - 1 ? formatDailyLabel(day.date) : ""}</span>
					</div>;
				})}
			</div>
		</div>
	</section>;
}
