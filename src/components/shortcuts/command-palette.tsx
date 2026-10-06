"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, CornerDownLeft } from "lucide-react";
import type { CommandItem } from "./types";
import { filterCommands, groupCommandsByCategory } from "./command-palette-utils";
import { CommandPaletteItem } from "./command-palette-item";

interface CommandPaletteProps {
	isOpen: boolean;
	onClose: () => void;
	commands: CommandItem[];
}

function CommandPaletteDialog({
	onClose,
	commands,
}: {
	onClose: () => void;
	commands: CommandItem[];
}) {
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const filteredCommands = useMemo(
		() => filterCommands(commands, query),
		[commands, query],
	);

	const activeIndex = Math.min(
		selectedIndex,
		Math.max(0, filteredCommands.length - 1),
	);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex(
				(prev) =>
					(prev - 1 + filteredCommands.length) % (filteredCommands.length || 1),
			);
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (filteredCommands[activeIndex]) {
				filteredCommands[activeIndex].perform();
				onClose();
			}
		} else if (e.key === "Escape") {
			e.preventDefault();
			onClose();
		}
	};

	const grouped = useMemo(
		() => groupCommandsByCategory(filteredCommands),
		[filteredCommands],
	);

	let flatIndex = 0;

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center bg-[color-mix(in_oklab,var(--foreground)_28%,transparent)] px-4 pt-[18vh] animate-in fade-in duration-100">
			<div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Command palette"
				className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[0_24px_48px_-20px_rgba(0,0,0,0.28)]"
				onKeyDown={handleKeyDown}
			>
				<div className="flex items-center gap-2.5 border-b border-[var(--border)] px-3.5 py-3">
					<Search className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setSelectedIndex(0);
						}}
						placeholder="Type a command…"
						className="w-full bg-transparent text-[15px] font-medium tracking-tight text-[var(--foreground)] placeholder:font-normal placeholder:text-[var(--muted-foreground)] focus:outline-none"
					/>
					<kbd className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--muted-foreground)]">
						ESC
					</kbd>
				</div>

				<div className="max-h-80 overflow-y-auto p-1.5">
					{filteredCommands.length === 0 ? (
						<div className="px-3 py-10 text-center text-sm text-[var(--muted-foreground)]">
							No commands match &ldquo;{query}&rdquo;
						</div>
					) : (
						Object.entries(grouped).map(([category, items]) => (
							<div key={category} className="mb-1 last:mb-0">
								<div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
									{category}
								</div>
								{items.map((item) => {
									const isCurrent = flatIndex === activeIndex;
									const itemIndex = flatIndex;
									flatIndex++;

									return (
										<CommandPaletteItem
											key={item.id}
											item={item}
											isActive={isCurrent}
											onSelect={() => {
												item.perform();
												onClose();
											}}
											onHover={() => setSelectedIndex(itemIndex)}
										/>
									);
								})}
							</div>
						))
					)}
				</div>

				<div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--muted)]/50 px-3.5 py-2 text-[11px] text-[var(--muted-foreground)]">
					<div className="flex items-center gap-3">
						<span className="inline-flex items-center gap-1">
							<kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1 py-px font-mono text-[10px]">
								↑↓
							</kbd>
							navigate
						</span>
						<span className="inline-flex items-center gap-1">
							<CornerDownLeft className="h-3 w-3" />
							select
						</span>
					</div>
					<span className="font-medium tracking-tight text-[var(--foreground)]/50">
						Dispatch
					</span>
				</div>
			</div>
		</div>
	);
}

export function CommandPalette({
	isOpen,
	onClose,
	commands,
}: CommandPaletteProps) {
	if (!isOpen) return null;
	return <CommandPaletteDialog onClose={onClose} commands={commands} />;
}
