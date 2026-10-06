import * as React from "react";
import { cn } from "@/lib/utils";
import type { CheckboxProps } from "./checkbox-types";

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
	({ className, ...props }, ref) => (
		<input
			type="checkbox"
			className={cn(
				"h-4 w-4 shrink-0 rounded border border-[var(--border)] bg-[var(--card)]",
				"accent-[var(--primary)] text-[var(--primary)]",
				"transition-[border-color,box-shadow] duration-150",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
				"disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			ref={ref}
			{...props}
		/>
	),
);
Checkbox.displayName = "Checkbox";
