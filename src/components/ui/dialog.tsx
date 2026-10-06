"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Accessible modal: focus is trapped and restored, Escape and the backdrop
 * close it, and it never grows past the viewport (the body scrolls instead).
 */
export function DialogContent({
	className,
	children,
	hideClose = false,
	...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
	return (
		<DialogPrimitive.Portal>
			<DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[2px]" />
			<DialogPrimitive.Content
				className={cn(
					"dialog-content fixed left-1/2 top-1/2 z-50",
					"w-[min(520px,calc(100vw-24px))] max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2",
					"overflow-y-auto overscroll-contain rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]",
					"p-6 text-[var(--foreground)] shadow-[var(--shadow-lg)] focus:outline-none",
					className,
				)}
				{...props}
			>
				{children}
				{!hideClose && (
					<DialogPrimitive.Close
						className={cn(
							"absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center",
							"rounded-lg text-[var(--muted-foreground)]",
							"transition-colors duration-150",
							"hover:bg-[var(--hover)] hover:text-[var(--foreground)]",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
						)}
					>
						<X className="h-4 w-4" />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</DialogPrimitive.Portal>
	);
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("mb-5 space-y-1.5 pr-8", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
			{...props}
		/>
	);
}

export function DialogTitle({
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			className={cn("text-[17px] font-semibold tracking-tight text-[var(--foreground)]", className)}
			{...props}
		/>
	);
}

export function DialogDescription({
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			className={cn("text-sm leading-relaxed text-[var(--muted-foreground)]", className)}
			{...props}
		/>
	);
}
