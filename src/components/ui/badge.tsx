import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	[
		"inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
		"text-[11px] font-medium leading-4 tracking-normal whitespace-nowrap",
		"transition-colors duration-150",
	].join(" "),
	{
		variants: {
			variant: {
				default: "border-transparent bg-[var(--accent)] text-[var(--accent-foreground)]",
				solid: "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
				secondary: "border-transparent bg-[var(--muted)] text-[var(--muted-foreground)]",
				outline: "border-[var(--border)] bg-transparent text-[var(--muted-foreground)]",
				success: "border-transparent bg-[var(--success-soft)] text-[var(--success)]",
				warning: "border-transparent bg-[var(--warning-soft)] text-[var(--warning)]",
				destructive: "border-transparent bg-[var(--destructive-soft)] text-[var(--destructive)]",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

export function Badge({
	className,
	variant,
	...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
	return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
