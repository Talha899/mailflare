"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, X } from "lucide-react";
import {
	formatDateTimeLocal,
	formatScheduledSend,
	getScheduleSendOptions,
	parseDateTimeLocal,
} from "./schedule-send-utils";
import type { ScheduleSendMenuProps } from "./schedule-send-types";
import { getUserTimeZone } from "@/lib/time/utils";

export function ScheduleSendMenu({ disabled, value, onChange }: ScheduleSendMenuProps) {
	const options = getScheduleSendOptions();
	const minimum = new Date(Date.now() + 5 * 60 * 1000);

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				type="button"
				disabled={disabled}
				aria-label="Schedule send options"
				className="inline-flex h-8 items-center justify-center rounded-r-lg border-l border-[color-mix(in_oklab,var(--compose-foreground)_22%,transparent)] bg-[var(--compose)] px-2 text-[var(--compose-foreground)] transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--compose)_88%,black)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--compose)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]"
			>
				<ChevronDown className="h-3.5 w-3.5" />
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="start"
					sideOffset={6}
					className="z-50 min-w-60 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 text-[13px] text-[var(--foreground)] shadow-[0_16px_40px_-18px_rgba(0,0,0,0.28)]"
				>
					{value && (
						<>
							<DropdownMenu.Item
								onSelect={() => onChange(null)}
								className="flex cursor-pointer items-center rounded-lg px-2.5 py-2 outline-none transition-colors hover:bg-[var(--muted)] focus:bg-[var(--muted)]"
							>
								<X className="mr-2 h-3.5 w-3.5 text-[var(--muted-foreground)]" />
								Clear schedule
							</DropdownMenu.Item>
							<DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
						</>
					)}
					{options.map((option) => {
						const selected =
							value &&
							option.value &&
							Math.abs(value.getTime() - option.value.getTime()) < 60_000;
						return (
							<DropdownMenu.Item
								key={option.label}
								onSelect={() => onChange(option.value)}
								className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 outline-none transition-colors hover:bg-[var(--muted)] focus:bg-[var(--muted)]"
							>
								<span className="flex min-w-0 items-center gap-2">
									{selected ? (
										<Check className="h-3.5 w-3.5 shrink-0 text-[var(--compose)]" />
									) : (
										<span className="w-3.5 shrink-0" />
									)}
									<span className="font-medium tracking-tight">{option.label}</span>
								</span>
								{option.value && (
									<span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
										{formatScheduledSend(option.value)}
									</span>
								)}
							</DropdownMenu.Item>
						);
					})}
					<DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
					<DropdownMenu.Label className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
						Pick date &amp; time ({getUserTimeZone()})
					</DropdownMenu.Label>
					<input
						type="datetime-local"
						min={formatDateTimeLocal(minimum)}
						value={value ? formatDateTimeLocal(value) : ""}
						onChange={(event) => onChange(parseDateTimeLocal(event.target.value))}
						onKeyDown={(event) => event.stopPropagation()}
						className="mx-1.5 mb-1.5 h-9 w-[calc(100%-12px)] rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--compose)] focus:ring-2 focus:ring-[var(--compose)]/20"
					/>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
