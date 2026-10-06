"use client";

import Link from "next/link";
import { Mail, X } from "lucide-react";
import { getEmailDisplayName } from "@/lib/email/address";
import type { NewMessagePopupProps } from "./new-message-popup-types";

export function NewMessagePopup({
	notification,
	onDismiss,
}: NewMessagePopupProps) {
	return (
		<div className="fixed right-5 top-5 z-[100] w-[min(380px,calc(100vw-40px))] rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl shadow-[color-mix(in_oklab,var(--foreground)_12%,transparent)]">
			<div className="flex items-start gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--primary)]">
					<Mail className="h-5 w-5" />
				</div>
				<Link
					href={`/inbox/${notification.messageId}`}
					onClick={onDismiss}
					className="min-w-0 flex-1"
				>
					<p className="text-sm font-semibold text-[var(--foreground)]">
						New email
					</p>
					<p className="mt-0.5 truncate text-sm text-[var(--foreground)]">
						{notification.subject || "(no subject)"}
					</p>
					<p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
						From {notification.fromName ?? getEmailDisplayName(notification.from)}
					</p>
				</Link>
				<button
					type="button"
					onClick={onDismiss}
					className="rounded-lg p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] active:scale-[0.98]"
				>
					<X className="h-4 w-4" />
					<span className="sr-only">Dismiss notification</span>
				</button>
			</div>
		</div>
	);
}
