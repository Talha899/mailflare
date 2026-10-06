import * as React from "react";
import { cn } from "@/lib/utils";
import type { CheckboxProps } from "./checkbox-types";

/**
 * A real checkbox input (so forms, labels and `onChange` keep working) with the
 * browser's own rendering replaced by a drawn box and check mark.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
	({ className, ...props }, ref) => (
		<span className={cn("relative inline-flex h-4 w-4 shrink-0 items-center justify-center", className)}>
			<input
				type="checkbox"
				ref={ref}
				className={cn(
					"peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none rounded-[5px]",
					"border border-[var(--border-strong)] bg-[var(--card)]",
					"transition-[background-color,border-color,box-shadow] duration-150",
					"hover:border-[color-mix(in_oklab,var(--border-strong)_60%,var(--foreground))]",
					"checked:border-[var(--primary)] checked:bg-[var(--primary)]",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]",
					"disabled:cursor-not-allowed disabled:opacity-50",
				)}
				{...props}
			/>
			<svg
				viewBox="0 0 16 16"
				aria-hidden
				className="pointer-events-none relative h-3 w-3 text-[var(--primary-foreground)] opacity-0 transition-opacity duration-100 peer-checked:opacity-100"
			>
				<path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</span>
	),
);
Checkbox.displayName = "Checkbox";
