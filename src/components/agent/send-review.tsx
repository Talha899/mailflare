"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth/client";
import { formatUserDate } from "@/lib/time/utils";
import { htmlToPlainText } from "@/components/compose/rich-text-utils";
import type { SendReviewProps } from "./send-review-types";

export function SendReview({ approvalId, snapshot, onClose, onSent }: SendReviewProps) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	async function confirm() {
		setBusy(true);
		setError(null);
		try {
			const response = await authFetch(`/api/agent/approvals/${approvalId}/confirm`, { method: "POST" });
			const result = await response.json() as { status?: string; messageId?: string; error?: string };
			if (!response.ok || result.status !== "sent" || !result.messageId) throw new Error(result.error || "Delivery needs review");
			window.dispatchEvent(new Event("mailflare:messages-changed"));
			onSent?.(result.messageId);
		} catch (cause) { setError(cause instanceof Error ? cause.message : "Could not send"); }
		finally { setBusy(false); }
	}
	return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[color-mix(in_oklab,var(--foreground)_60%,transparent)] p-4" role="dialog" aria-modal="true" aria-label="Review email before sending">
		<div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-[var(--card)] p-5 shadow-2xl">
			<h2 className="text-lg font-semibold">{snapshot.scheduledAt ? "Review and schedule" : "Review and send"}</h2>
			<p className="mt-1 text-sm text-[var(--muted-foreground)]">Confirm this exact AI draft before it is {snapshot.scheduledAt ? "scheduled" : "delivered"}.</p>
			<dl className="mt-4 grid grid-cols-[5rem_1fr] gap-2 text-sm break-words">
				<dt className="text-[var(--muted-foreground)]">From</dt><dd>{snapshot.from}</dd>
				<dt className="text-[var(--muted-foreground)]">To</dt><dd>{snapshot.to}</dd>
				{snapshot.cc && <><dt className="text-[var(--muted-foreground)]">Cc</dt><dd>{snapshot.cc}</dd></>}
				{snapshot.bcc && <><dt className="text-[var(--muted-foreground)]">Bcc</dt><dd>{snapshot.bcc}</dd></>}
				<dt className="text-[var(--muted-foreground)]">Subject</dt><dd>{snapshot.subject}</dd>
				{snapshot.scheduledAt && <><dt className="text-[var(--muted-foreground)]">Send at</dt><dd>{formatUserDate(snapshot.scheduledAt, { dateStyle: "medium", timeStyle: "short" })}</dd></>}
			</dl>
			<pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] p-3 text-sm">{snapshot.text || htmlToPlainText(snapshot.html || "")}</pre>
			{snapshot.attachments.length > 0 && <p className="mt-3 text-sm">Attachments: {snapshot.attachments.map((item) => item.filename).join(", ")}</p>}
			{error && <p className="mt-3 text-sm text-[var(--destructive)]">{error}</p>}
			<div className="mt-5 flex justify-end gap-3">
				{onClose && <button type="button" className="rounded-lg border border-[var(--border)] px-4 py-2 text-[var(--foreground)]" onClick={onClose} disabled={busy}>Cancel</button>}
				<button type="button" className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--primary-foreground)] disabled:opacity-50" onClick={() => void confirm()} disabled={busy}>{busy ? snapshot.scheduledAt ? "Scheduling…" : "Sending…" : snapshot.scheduledAt ? "Confirm and schedule" : "Confirm and send"}</button>
			</div>
		</div>
	</div>;
}
