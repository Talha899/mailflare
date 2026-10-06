"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
	className,
	children,
	...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
	return (
		<DialogPrimitive.Portal>
			<DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--foreground)_28%,transparent)]" />
			<DialogPrimitive.Content
				className={cn(
					"dialog-content fixed left-1/2 top-1/2 z-50",
					"w-[min(520px,calc(100vw-32px))] max-h-[calc(100vh-4rem)] -translate-x-1/2 -translate-y-1/2",
					"overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)]",
					"p-6 text-[var(--foreground)] shadow-sm",
					className,
				)}
				{...props}
			>
				{children}
				<DialogPrimitive.Close
					className={cn(
						"absolute right-3.5 top-3.5 inline-flex h-8 w-8 items-center justify-center",
						"rounded-lg text-[var(--muted-foreground)]",
						"transition-colors duration-150",
						"hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
						"active:scale-[0.98]",
					)}
				>
					<X className="h-4 w-4" />
					<span className="sr-only">Close</span>
				</DialogPrimitive.Close>
			</DialogPrimitive.Content>
		</DialogPrimitive.Portal>
	);
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"mb-5 space-y-1.5 border-b border-[var(--border)] pb-4 pr-8",
				className,
			)}
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
			className={cn(
				"text-lg font-semibold tracking-tight text-[var(--foreground)]",
				className,
			)}
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
