import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldClassName = cn(
	"w-full rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)]",
	"shadow-[var(--shadow-sm)] placeholder:text-[var(--subtle-foreground)]",
	"transition-[border-color,box-shadow,background-color] duration-150",
	"hover:border-[var(--border-strong)]",
	"focus-visible:outline-none focus-visible:border-[var(--ring)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_22%,transparent)]",
	"aria-[invalid=true]:border-[var(--destructive)] aria-[invalid=true]:focus-visible:ring-[color-mix(in_oklab,var(--destructive)_22%,transparent)]",
	"disabled:cursor-not-allowed disabled:bg-[var(--muted)] disabled:opacity-60",
	"read-only:bg-[var(--surface-sunken)] read-only:shadow-none",
);

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, type, ...props }, ref) => (
		<input
			type={type}
			className={cn(
				"flex h-9 px-3 py-2",
				fieldClassName,
				"file:mr-3 file:rounded-md file:border-0 file:bg-[var(--muted)] file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-[var(--foreground)]",
				"[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 dark:[&::-webkit-calendar-picker-indicator]:invert",
				className,
			)}
			ref={ref}
			{...props}
		/>
	),
);
Input.displayName = "Input";
