import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, type, ...props }, ref) => (
		<input
			type={type}
			className={cn(
				"flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--card)]",
				"px-3 py-2 text-sm text-[var(--foreground)]",
				"placeholder:text-[var(--muted-foreground)]",
				"transition-[border-color,box-shadow] duration-150",
				"focus-visible:outline-none focus-visible:border-[var(--ring)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]/25",
				"disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--muted)]",
				"file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--foreground)]",
				className,
			)}
			ref={ref}
			{...props}
		/>
	),
);
Input.displayName = "Input";
