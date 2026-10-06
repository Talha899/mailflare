import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90",
				outline:
					"border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]",
				ghost: "hover:bg-[var(--muted)]",
				destructive: "bg-[var(--destructive)] text-white hover:opacity-90",
			},
			size: {
				default: "h-10 px-6 py-2 rounded-xl",
				sm: "h-8 rounded-lg px-3 text-xs",
				lg: "h-11 rounded-xl px-8",
				roundedSM: "rounded-full p-2 text-xs",
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
