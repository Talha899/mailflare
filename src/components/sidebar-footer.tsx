"use client";

import packageJson from "../../package.json";
import { DEFAULT_PRODUCT_URL } from "@/lib/branding/constants";
import { useSidebar } from "./sidebar-state";
import { useShortcuts } from "./shortcuts";
import { Keyboard } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function SidebarFooter() {
	const { minimal } = useSidebar();
	const { openHelpModal, shortcutsEnabled, shortcutsPreferenceLoading } = useShortcuts();
	if (minimal) return null;

	return (
		<div className="flex flex-col gap-2 px-3 pt-3">
			<ThemeToggle />
			{shortcutsEnabled && !shortcutsPreferenceLoading && (
				<button
					type="button"
					onClick={openHelpModal}
					className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
				>
					<span className="flex items-center gap-1.5">
						<Keyboard className="h-3.5 w-3.5" />
						Shortcuts
					</span>
					<kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)] shadow-2xs">
						?
					</kbd>
				</button>
			)}
			<p className="px-1 text-[11px] text-[var(--muted-foreground)]">
				Powered by{" "}
				<a
					href={`${DEFAULT_PRODUCT_URL}?ref=${typeof window !== "undefined" ? location.hostname : ""}&v=${packageJson.version}`}
					target="_blank"
					className="text-[var(--muted-foreground)] hover:underline"
					rel="noreferrer"
				>
					Postora v{packageJson.version}
				</a>
			</p>
		</div>
	);
}
