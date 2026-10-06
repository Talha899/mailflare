import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
	[
		"relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap",
		"rounded-lg text-sm font-medium tracking-tight",
		"transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]",
		"disabled:pointer-events-none disabled:opacity-50",
		"active:translate-y-px",
		"[&_svg]:shrink-0",
	].join(" "),
	{
		variants: {
			variant: {
				/** The one primary action on a surface. */
				default:
					"bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]",
				/** Secondary actions next to a primary one. */
				outline:
					"border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] hover:bg-[var(--hover)]",
				secondary:
					"bg-[var(--muted)] text-[var(--foreground)] hover:bg-[color-mix(in_oklab,var(--muted)_80%,var(--foreground))]",
				/** Toolbar and icon buttons. */
				ghost:
					"text-[var(--muted-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] aria-pressed:bg-[var(--accent)] aria-pressed:text-[var(--accent-foreground)]",
				destructive:
					"bg-[var(--destructive)] text-[var(--destructive-foreground)] shadow-[var(--shadow-sm)] hover:bg-[color-mix(in_oklab,var(--destructive)_88%,black)]",
				/** Destructive action that should not shout (e.g. inside a settings row). */
				"destructive-soft":
					"bg-[var(--destructive-soft)] text-[var(--destructive)] hover:bg-[color-mix(in_oklab,var(--destructive-soft)_80%,var(--destructive))]",
				link: "h-auto px-0 text-[var(--primary)] underline-offset-4 hover:underline",
			},
			size: {
				default: "h-9 px-4",
				sm: "h-8 px-3 text-[13px]",
				xs: "h-7 rounded-md px-2.5 text-xs",
				lg: "h-11 px-6 text-[15px]",
				icon: "h-9 w-9 p-0",
				"icon-sm": "h-8 w-8 p-0",
				/** Kept for existing callers; same as icon. */
				roundedSM: "h-9 w-9 p-0 text-xs",
			},
		},
		compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
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
	/** Shows a spinner, keeps the width, and blocks clicks while an action runs. */
	loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
		const classes = cn("cursor-pointer", buttonVariants({ variant, size }), className);
		if (asChild) {
			return (
				<Slot className={classes} ref={ref} {...props}>
					{children}
				</Slot>
			);
		}
		return (
			<button
				className={classes}
				ref={ref}
				disabled={disabled || loading}
				aria-busy={loading || undefined}
				{...props}
			>
				{loading ? (
					<>
						<span className="absolute inset-0 flex items-center justify-center" aria-hidden>
							<Loader2 className="h-4 w-4 animate-spin" />
						</span>
						<span className="invisible inline-flex items-center gap-2">{children}</span>
					</>
				) : (
					children
				)}
			</button>
		);
	},
);
Button.displayName = "Button";
