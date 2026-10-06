"use client";

import { cn } from "@/lib/utils";
import type { SwitchProps } from "./switch-types";

export function Switch({
	checked,
	onCheckedChange,
	className,
	disabled,
	...props
}: SwitchProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			disabled={disabled}
			onClick={() => onCheckedChange(!checked)}
			className={cn(
				"relative inline-flex h-6 w-11 shrink-0 items-center rounded-full",
				"border border-transparent",
				"transition-colors duration-150",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
				"disabled:cursor-not-allowed disabled:opacity-50",
				"active:scale-[0.98]",
				checked
					? "bg-[var(--primary)]"
					: "bg-[var(--muted)] border-[var(--border)]",
				className,
			)}
			{...props}
		>
			<span
				className={cn(
					"pointer-events-none block h-5 w-5 rounded-full",
					"bg-[var(--card)] shadow-sm",
					"transition-transform duration-150",
					checked ? "translate-x-[21px]" : "translate-x-0.5",
				)}
			/>
		</button>
	);
}
