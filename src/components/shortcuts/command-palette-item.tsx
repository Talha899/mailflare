"use client";

import React from "react";
import type { CommandItem } from "./types";

interface CommandPaletteItemProps {
	item: CommandItem;
	isActive: boolean;
	onSelect: () => void;
	onHover: () => void;
}

export function CommandPaletteItem({
	item,
	isActive,
	onSelect,
	onHover,
}: CommandPaletteItemProps) {
	const Icon = item.icon;

	return (
		<button
			type="button"
			onClick={onSelect}
			onMouseEnter={onHover}
			className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors duration-150 active:scale-[0.99] ${
				isActive
					? "bg-[var(--primary)] text-[var(--primary-foreground)]"
					: "text-[var(--foreground)] hover:bg-[var(--muted)]"
			}`}
		>
			<div className="flex min-w-0 items-center gap-2.5">
				{Icon && (
					<Icon
						className={`h-3.5 w-3.5 shrink-0 ${
							isActive
								? "text-[var(--primary-foreground)]/80"
								: "text-[var(--muted-foreground)]"
						}`}
					/>
				)}
				<div className="truncate">
					<span className="text-[13px] font-medium tracking-tight">
						{item.title}
					</span>
					{item.subtitle && (
						<span
							className={`ml-2 truncate text-xs ${
								isActive
									? "text-[var(--primary-foreground)]/65"
									: "text-[var(--muted-foreground)]"
							}`}
						>
							{item.subtitle}
						</span>
					)}
				</div>
			</div>
			{item.shortcut && (
				<kbd
					className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium ${
						isActive
							? "bg-[color-mix(in_oklab,var(--primary-foreground)_16%,transparent)] text-[var(--primary-foreground)]/85"
							: "border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]"
					}`}
				>
					{item.shortcut}
				</kbd>
			)}
		</button>
	);
}
