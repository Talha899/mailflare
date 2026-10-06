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
		<div className="flex h-12 flex-1 items-center gap-2.5 rounded-full bg-[var(--muted)] px-4 text-[var(--muted-foreground)] focus-within:ring-2 focus-within:ring-[var(--primary)]/30 transition-all">
			<Search className="h-5 w-5 shrink-0" />
			<Input
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				placeholder={showShortcutHints ? "Search mail (press / to focus)" : "Search mail"}
				className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[var(--foreground)] outline-none! shadow-none! border-none! placeholder:text-[var(--muted-foreground)]"
			/>
			{query ? (
				<button
					type="button"
					onClick={() => setQuery("")}
					className="rounded-full p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
					aria-label="Clear search"
				>
					<X className="h-4 w-4" />
				</button>
			) : showShortcutHints ? (
				<button
					type="button"
					onClick={openCommandPalette}
					className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)] bg-[var(--card)]/70 hover:bg-[var(--card)] border border-[var(--border)]/80 rounded-md shadow-2xs transition-colors"
					title="Open Command Palette (⌘K)"
				>
					<span className="text-[11px] font-mono">⌘K</span>
				</button>
			) : null}
		</div>
	);
}
