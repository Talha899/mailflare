"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMailSearch } from "./mail-search-context";
import { useShortcuts } from "@/components/shortcuts";

export function MailSearchInput() {
	const { input: query, setQuery } = useMailSearch();
	const { openCommandPalette, shortcutsEnabled, shortcutsPreferenceLoading } = useShortcuts();
	const showShortcutHints = shortcutsEnabled && !shortcutsPreferenceLoading;

	return (
		<div className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 text-[var(--muted-foreground)] transition-[border-color,box-shadow] duration-150 focus-within:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_12%,transparent)]">
			<Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
			<Input
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				placeholder={showShortcutHints ? "Search mail (press / to focus)" : "Search mail"}
				className="h-full min-w-0 flex-1 border-none! bg-transparent text-[13px] tracking-tight text-[var(--foreground)] shadow-none! outline-none! placeholder:text-[var(--muted-foreground)]"
			/>
			{query ? (
				<button
					type="button"
					onClick={() => setQuery("")}
					className="rounded-md p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] active:scale-[0.98]"
					aria-label="Clear search"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			) : showShortcutHints ? (
				<button
					type="button"
					onClick={openCommandPalette}
					className="hidden items-center rounded-md border border-[var(--border)] bg-[var(--muted)]/70 px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] active:scale-[0.98] sm:inline-flex"
					title="Open Command Palette (⌘K)"
				>
					⌘K
				</button>
			) : null}
		</div>
	);
}
