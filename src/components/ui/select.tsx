import * as React from "react";
import { cn } from "@/lib/utils";
import type { SelectProps } from "./select-types";

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
	({ className, containerClassName, ...props }, ref) => (
		<span
			className={cn(
				"inline-flex h-10 items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5",
				"transition-[border-color,box-shadow] duration-150",
				"focus-within:border-[var(--ring)] focus-within:ring-2 focus-within:ring-[var(--ring)]/25",
				containerClassName,
			)}
		>
			<select
				className={cn(
					"flex h-full w-full appearance-none bg-transparent text-sm text-[var(--foreground)]",
					"focus-visible:outline-none",
					"disabled:cursor-not-allowed disabled:opacity-50",
					className,
				)}
				ref={ref}
				{...props}
			/>
		</span>
	),
);
Select.displayName = "Select";
