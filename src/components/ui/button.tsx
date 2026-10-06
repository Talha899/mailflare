import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	[
		"inline-flex items-center justify-center gap-2 whitespace-nowrap",
		"rounded-lg text-sm font-medium tracking-tight",
		"transition-[color,background-color,border-color,opacity,transform] duration-150",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
		"disabled:pointer-events-none disabled:opacity-45",
		"active:scale-[0.98]",
	].join(" "),
	{
		variants: {
			variant: {
				default:
					"bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[color-mix(in_oklab,var(--primary)_88%,var(--foreground))]",
				outline:
					"border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] hover:border-[color-mix(in_oklab,var(--border)_70%,var(--foreground))]",
				ghost:
					"text-[var(--foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
				destructive:
					"bg-[var(--destructive)] text-[var(--primary-foreground)] hover:bg-[color-mix(in_oklab,var(--destructive)_88%,black)]",
			},
			size: {
				default: "h-10 px-5 py-2 rounded-xl",
				sm: "h-8 rounded-lg px-3 text-xs",
				lg: "h-11 rounded-xl px-7 text-[15px]",
				/* Icon affordance — keep API; use rounded-lg (not pill) */
				roundedSM: "h-9 w-9 shrink-0 rounded-lg p-0 text-xs",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn("cursor-pointer", buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";
