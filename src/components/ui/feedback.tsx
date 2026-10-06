import * as React from "react";
import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inline spinner for buttons, rows and small regions. */
export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
	return (
		<span role="status" className="inline-flex items-center">
			<Loader2 className={cn("h-4 w-4 animate-spin text-[var(--muted-foreground)]", className)} aria-hidden />
			<span className="sr-only">{label}</span>
		</span>
	);
}

/**
 * The one empty-state pattern: an icon, what is (not) here, and what to do
 * next. Use for empty folders, no search results, no domains, and so on.
 */
export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	className,
	compact = false,
}: {
	icon?: React.ComponentType<{ className?: string }>;
	title: string;
	description?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
	compact?: boolean;
}) {
	return (
		<div
			className={cn(
				"fade-in flex flex-col items-center justify-center text-center",
				compact ? "gap-2 px-6 py-10" : "gap-3 px-6 py-16",
				className,
			)}
		>
			{Icon && (
				<span
					className={cn(
						"flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--muted-foreground)]",
						compact ? "mb-1 h-11 w-11" : "mb-2 h-14 w-14",
					)}
				>
					<Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
				</span>
			)}
			<p className={cn("font-semibold tracking-tight text-[var(--foreground)]", compact ? "text-sm" : "text-base")}>{title}</p>
			{description && (
				<p className="max-w-sm text-sm leading-relaxed text-[var(--muted-foreground)]">{description}</p>
			)}
			{action && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>}
		</div>
	);
}

const alertStyles = {
	info: { icon: Info, className: "border-[color-mix(in_oklab,var(--info)_25%,transparent)] bg-[var(--info-soft)] text-[var(--foreground)] [&_[data-alert-icon]]:text-[var(--info)]" },
	success: { icon: CheckCircle2, className: "border-[color-mix(in_oklab,var(--success)_25%,transparent)] bg-[var(--success-soft)] text-[var(--foreground)] [&_[data-alert-icon]]:text-[var(--success)]" },
	warning: { icon: TriangleAlert, className: "border-[color-mix(in_oklab,var(--warning)_30%,transparent)] bg-[var(--warning-soft)] text-[var(--foreground)] [&_[data-alert-icon]]:text-[var(--warning)]" },
	error: { icon: AlertCircle, className: "border-[color-mix(in_oklab,var(--destructive)_25%,transparent)] bg-[var(--destructive-soft)] text-[var(--foreground)] [&_[data-alert-icon]]:text-[var(--destructive)]" },
} as const;

/** Inline, persistent message (form errors, configuration warnings). Toasts are for transient feedback. */
export function Alert({
	tone = "info",
	title,
	children,
	action,
	className,
}: {
	tone?: keyof typeof alertStyles;
	title?: string;
	children?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}) {
	const { icon: Icon, className: toneClassName } = alertStyles[tone];
	return (
		<div
			role={tone === "error" ? "alert" : "status"}
			className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", toneClassName, className)}
		>
			<Icon data-alert-icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
			<div className="min-w-0 flex-1 space-y-1">
				{title && <p className="font-medium">{title}</p>}
				{children && <div className="leading-relaxed text-[var(--muted-foreground)]">{children}</div>}
			</div>
			{action && <div className="shrink-0">{action}</div>}
		</div>
	);
}

/** Title row for a page or settings section: heading, supporting line, actions on the right. */
export function PageHeader({
	title,
	description,
	actions,
	className,
	eyebrow,
}: {
	title: React.ReactNode;
	description?: React.ReactNode;
	actions?: React.ReactNode;
	className?: string;
	eyebrow?: React.ReactNode;
}) {
	return (
		<div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
			<div className="min-w-0 space-y-1">
				{eyebrow && <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--subtle-foreground)]">{eyebrow}</p>}
				<h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
				{description && <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">{description}</p>}
			</div>
			{actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
		</div>
	);
}

/** Keyboard key hint, e.g. <Kbd>C</Kbd>. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
	return (
		<kbd
			className={cn(
				"inline-flex h-5 min-w-5 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-sunken)] px-1 font-mono text-[11px] font-medium text-[var(--muted-foreground)]",
				className,
			)}
		>
			{children}
		</kbd>
	);
}
