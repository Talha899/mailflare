import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
	({ className, ...props }, ref) => (
		<textarea
			className={cn(
				"flex min-h-[88px] w-full rounded-lg border border-[var(--border)] bg-[var(--card)]",
				"px-3 py-2.5 text-sm text-[var(--foreground)] leading-relaxed",
				"placeholder:text-[var(--muted-foreground)]",
				"transition-[border-color,box-shadow] duration-150",
				"focus-visible:outline-none focus-visible:border-[var(--ring)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]/25",
				"disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--muted)]",
				"resize-y",
				className,
			)}
			ref={ref}
			{...props}
		/>
	),
);
Textarea.displayName = "Textarea";
