import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
	{
		variants: {
			variant: {
				success: "border-transparent bg-[var(--success)]/10 text-[var(--success)]",
				default: "border-transparent bg-[var(--foreground)] text-[var(--background)]",
				secondary: "border-transparent bg-[var(--muted)] text-[var(--foreground)]",
				outline: "bg-[var(--muted)] border-transparent",
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
			className={cn(badgeVariants({ variant }), "text-[9px] uppercase", className)}
			{...props}
		/>
	);
}
