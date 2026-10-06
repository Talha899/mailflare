"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Download, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MessageSourceDialogProps } from "./message-source-dialog-types";
import { copyMessageSource, downloadMessageSource, fetchMessageSource, summarizeMessageSource } from "./message-source-utils";

export function MessageSourceDialog({ messageId, open, onOpenChange }: MessageSourceDialogProps) {
	const [source, setSource] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [copied, setCopied] = useState(false);
	const [copyError, setCopyError] = useState(false);
	const summary = useMemo(() => source === null ? null : summarizeMessageSource(source), [source]);

	useEffect(() => {
		if (!open) return;
		const controller = new AbortController();
		setSource(null);
		setError(null);
		setCopied(false);
		setCopyError(false);
		setLoading(true);
		fetchMessageSource(messageId, controller.signal)
			.then((value) => {
				if (!controller.signal.aborted) setSource(value);
			})
			.catch((reason) => {
				if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to load original message");
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});
		return () => controller.abort();
	}, [messageId, open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] w-[min(960px,calc(100vw-32px))] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Original Message</DialogTitle>
					<DialogDescription>Message details and full source, including headers and MIME body.</DialogDescription>
				</DialogHeader>
				{loading && <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><LoaderCircle className="h-4 w-4 animate-spin" />Loading source…</div>}
				{error && <p className="text-sm text-[var(--muted-foreground)]">{error}</p>}
				{source !== null && summary && (
					<div className="space-y-5">
						<div className="overflow-hidden rounded-lg border border-[var(--border)] text-sm">
							{([
								["Message ID", summary.messageId],
								["Created at", summary.createdAt],
								["From", summary.from],
								["To", summary.to],
								["Subject", summary.subject],
							] as const).map(([label, value]) => (
								<div key={label} className="grid gap-1 border-b border-[var(--border)] px-4 py-3 last:border-b-0 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4">
									<span className="font-medium text-[var(--foreground)]">{label}</span>
									<span className={label === "Message ID" && value ? "break-all text-[var(--success)]" : "break-words text-[var(--foreground)]"}>{value || "Unavailable"}</span>
								</div>
							))}
							{(["spf", "dkim", "dmarc"] as const).map((method) => {
								const result = summary[method];
								return (
									<div key={method} className="grid gap-1 border-b border-[var(--border)] px-4 py-3 last:border-b-0 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4">
										<span className="font-medium uppercase text-[var(--foreground)]">{method}</span>
										<span className="flex min-w-0 items-center gap-1.5 break-all text-[var(--foreground)]">
											{result?.status === "PASS" && <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" aria-label={`${method.toUpperCase()} passed`} />}
											{result ? `${result.status}${result.detail ? ` ${result.detail}` : ""}` : "No result in message headers"}
										</span>
									</div>
								);
							})}
						</div>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<Button type="button" variant="ghost" size="sm" className="text-[var(--primary)] hover:text-[var(--primary)]" onClick={() => downloadMessageSource(source, messageId)}><Download className="h-4 w-4" />Download Original</Button>
							<div className="flex items-center gap-2">
								{copyError && <span role="alert" className="text-xs text-[var(--destructive)]">Could not copy</span>}
								<Button type="button" size="sm" onClick={() => { void copyMessageSource(source).then(() => { setCopied(true); setCopyError(false); }).catch(() => { setCopied(false); setCopyError(true); }); }}><Copy className="h-4 w-4" />{copied ? "Copied" : "Copy to clipboard"}</Button>
							</div>
						</div>
						<pre className="max-h-[40vh] overflow-auto rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4 font-mono text-xs leading-relaxed text-[var(--foreground)] whitespace-pre">{source}</pre>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
