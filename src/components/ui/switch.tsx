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
				"relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
				"border border-transparent",
				"transition-colors duration-150",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]",
				"disabled:cursor-not-allowed disabled:opacity-50",
				checked
					? "bg-[var(--primary)]"
					: "bg-[var(--border-strong)]",
				className,
			)}
			{...props}
		>
			<span
				className={cn(
					"pointer-events-none block h-4 w-4 rounded-full",
					"bg-white shadow-[0_1px_2px_rgb(0_0_0/0.25)]",
					"transition-transform duration-150 ease-[var(--ease-out-quart)]",
					checked ? "translate-x-[17px]" : "translate-x-0.5",
				)}
			/>
		</button>
	);
}
