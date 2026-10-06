import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	[
		"inline-flex items-center rounded-md border px-2 py-0.5",
		"text-[10px] font-semibold uppercase tracking-wide",
		"transition-colors duration-150",
	].join(" "),
	{
		variants: {
			variant: {
				default:
					"border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
				secondary:
					"border-transparent bg-[var(--muted)] text-[var(--foreground)]",
				outline:
					"border-[var(--border)] bg-transparent text-[var(--muted-foreground)]",
				success:
					"border-transparent bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

export function Badge({
	className,
	variant,
	...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
	return (
		<div
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}
