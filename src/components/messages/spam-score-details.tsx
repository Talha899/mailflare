import type { SpamScoreDetailsProps } from "./spam-score-details-types";
import { parseSpamSignals } from "./spam-score-details-utils";

export function SpamScoreDetails({ score, verdict, signals, analysisError }: SpamScoreDetailsProps) {
	if (score == null && !analysisError) return null;
	const parsedSignals = parseSpamSignals(signals);
	return (
		<details className="mb-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3">
			<summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">
				{score == null ? "Spam analysis unavailable" : `Spam score: ${score} · ${verdict ?? "inbox"}`}
			</summary>
			{analysisError ? (
				<p className="mt-2 text-sm text-[var(--muted-foreground)]">The filter could not analyze this message. It was delivered normally.</p>
			) : parsedSignals.length > 0 ? (
				<div className="mt-3 space-y-1.5 text-sm text-[var(--muted-foreground)]">
					<p className="font-medium text-[var(--foreground)]">Why Dispatch gave this score</p>
					{parsedSignals.map((signal) => (
						<p key={signal.id}><span className={signal.score > 0 ? "text-[var(--destructive)]" : "text-[var(--success)]"}>{signal.score > 0 ? "+" : ""}{signal.score}</span>{" "}{signal.reason}</p>
					))}
				</div>
			) : (
				<p className="mt-2 text-sm text-[var(--muted-foreground)]">No significant spam signals were found.</p>
			)}
		</details>
	);
}
