"use client";

import React from "react";
import { X, Keyboard } from "lucide-react";
import type { ShortcutDefinition } from "./types";

interface ShortcutsHelpDialogProps {
	isOpen: boolean;
	onClose: () => void;
	shortcuts: ShortcutDefinition[];
}

export function ShortcutsHelpDialog({
	isOpen,
	onClose,
	shortcuts,
}: ShortcutsHelpDialogProps) {
	if (!isOpen) return null;

	const grouped = shortcuts.reduce(
		(acc, item) => {
			if (!acc[item.category]) acc[item.category] = [];
			acc[item.category].push(item);
			return acc;
		},
		{} as Record<string, ShortcutDefinition[]>,
	);

	const formatKey = (shortcut: ShortcutDefinition) => {
		const parts: string[] = [];
		if (shortcut.modifiers) {
			shortcut.modifiers.forEach((m) => {
				if (m === "ctrl") parts.push("Ctrl");
				if (m === "meta") parts.push("⌘");
				if (m === "alt") parts.push("Alt");
				if (m === "shift") parts.push("Shift");
			});
		}
		parts.push(shortcut.key.toUpperCase());
		return parts.join(" + ");
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_oklab,var(--foreground)_28%,transparent)] p-4 animate-in fade-in duration-100">
			<div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="shortcuts-help-title"
				className="relative z-10 flex max-h-[min(85vh,640px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[0_24px_48px_-20px_rgba(0,0,0,0.28)]"
			>
				<div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
					<div className="flex items-center gap-2.5">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--foreground)]">
							<Keyboard className="h-4 w-4" />
						</div>
						<div>
							<h2
								id="shortcuts-help-title"
								className="text-sm font-semibold tracking-tight text-[var(--foreground)]"
							>
								Keyboard shortcuts
							</h2>
							<p className="text-xs text-[var(--muted-foreground)]">
								Quick keys for inbox, compose, and navigation
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close shortcuts"
						className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] active:scale-[0.98]"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				<div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-5 md:grid-cols-2">
					{Object.entries(grouped).map(([category, items]) => (
						<section key={category} className="space-y-2.5">
							<h3 className="border-b border-[var(--border)] pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
								{category}
							</h3>
							<ul className="space-y-1.5">
								{items.map((item, idx) => (
									<li
										key={idx}
										className="flex items-center justify-between gap-3 text-[13px]"
									>
										<span className="min-w-0 truncate text-[var(--foreground)]">
											{item.label}
										</span>
										<kbd className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--foreground)]">
											{formatKey(item)}
										</kbd>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>

				<div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--muted)]/50 px-5 py-2.5 text-[11px] text-[var(--muted-foreground)]">
					<span>
						Press{" "}
						<kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1 py-px font-mono text-[10px] text-[var(--foreground)]">
							?
						</kbd>{" "}
						to toggle
					</span>
					<span>
						Press{" "}
						<kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1 py-px font-mono text-[10px] text-[var(--foreground)]">
							ESC
						</kbd>{" "}
						to close
					</span>
				</div>
			</div>
		</div>
	);
}
