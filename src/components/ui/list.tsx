import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export function List({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"grid gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)]",
				"[&>*:first-child]:rounded-t-[calc(0.75rem-1px)] [&>*:last-child]:rounded-b-[calc(0.75rem-1px)]",
				className,
			)}
			{...props}
		/>
	);
}

export interface ListRowProps extends React.HTMLAttributes<HTMLElement> {
	asChild?: boolean;
}

export function ListRow({ className, asChild = false, ...props }: ListRowProps) {
	const Comp: React.ElementType = asChild ? Slot : "div";
	return (
		<Comp
			className={cn(
				"flex items-center gap-4 bg-[var(--card)] p-5 text-[var(--foreground)]",
				"transition-colors duration-150",
				"hover:bg-[color-mix(in_oklab,var(--accent)_55%,var(--card))]",
				className,
			)}
			{...props}
		/>
	);
}
