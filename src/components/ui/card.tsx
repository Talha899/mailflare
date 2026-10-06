import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm",
				className,
			)}
			{...props}
		/>
	);
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("flex flex-col gap-1.5 py-6", className)}
			{...props}
		/>
	);
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h3
			className={cn(
				"text-lg font-semibold leading-none tracking-tight text-[var(--foreground)]",
				className,
			)}
			{...props}
		/>
	);
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
	return (
		<p
			className={cn("text-sm leading-relaxed text-[var(--muted-foreground)]", className)}
			{...props}
		/>
	);
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("pb-0", className)} {...props} />;
}
