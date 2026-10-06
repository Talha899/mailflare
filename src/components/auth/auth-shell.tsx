"use client";

import { useEffect, useState } from "react";
import { useBranding } from "@/components/branding-provider";
import type { AuthShellProps } from "./types";

export function AuthShell({
	icon: Icon,
	title,
	description,
	children,
	footer,
	steps,
	variant = "mailbox",
	eyebrow,
}: AuthShellProps) {
	const branding = useBranding();
	const [iconUrl, setIconUrl] = useState(branding.iconUrl);
	const [iconFailed, setIconFailed] = useState(false);
	const isAdmin = variant === "admin";

	useEffect(() => {
		setIconUrl(branding.iconUrl);
		setIconFailed(false);
	}, [branding.iconUrl]);

	const brandMark = (
		<span className="flex items-center justify-center overflow-hidden">
			{iconFailed ? (
				<Icon className={`h-7 w-7 ${isAdmin ? "text-[var(--foreground)]" : "text-[var(--primary)]"}`} />
			) : (
				<img
					src={iconUrl}
					onError={() => {
						if (iconUrl !== "/logo.svg") setIconUrl("/logo.svg");
						else setIconFailed(true);
					}}
					alt=""
					className="h-7 w-7 object-contain"
				/>
			)}
		</span>
	);

	if (isAdmin) {
		return (
			<div className="relative min-h-dvh overflow-hidden bg-[var(--sidebar)] px-4 py-8 text-[var(--foreground)] sm:px-6 lg:px-8">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-[0.35]"
					style={{
						backgroundImage:
							"linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
						backgroundSize: "28px 28px",
						maskImage: "radial-gradient(ellipse at 50% 20%, black 20%, transparent 75%)",
					}}
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-60"
					style={{
						background:
							"linear-gradient(180deg, color-mix(in oklab, var(--muted) 80%, transparent), transparent)",
					}}
				/>

				<main className="relative z-10 mx-auto w-full max-w-md">
					<header className="mb-8 flex items-start gap-3 border-b border-[var(--border)] pb-5">
						{brandMark}
						<div className="min-w-0">
							<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
								{eyebrow ?? "Admin console"}
							</p>
							<p className="truncate text-sm font-medium text-[var(--foreground)]">
								{branding.appName}
							</p>
						</div>
					</header>

					<section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-7">
						<div className="mb-6">
							<h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
							{description && (
								<p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
							)}
						</div>

						{steps && (
							<div className="mb-5 flex flex-wrap gap-2 border-b border-[var(--border)] pb-4 font-mono text-[11px] font-medium uppercase tracking-wide">
								{steps.map((step, index) => (
									<span key={step.label} className="flex items-center gap-2">
										<span
											className={
												step.active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
											}
										>
											{String(index + 1).padStart(2, "0")} {step.label}
										</span>
										{index < steps.length - 1 && (
											<span className="text-[var(--border)]">/</span>
										)}
									</span>
								))}
							</div>
						)}

						<div className="w-full">{children}</div>
					</section>

					{footer && <div className="mt-6">{footer}</div>}
				</main>
			</div>
		);
	}

	return (
		<div className="relative min-h-dvh overflow-hidden bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 lg:flex lg:items-center lg:px-10 lg:py-12">
			<div
				aria-hidden
				className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full opacity-50 blur-3xl"
				style={{ background: "color-mix(in oklab, var(--accent) 90%, transparent)" }}
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full opacity-40 blur-3xl"
				style={{ background: "color-mix(in oklab, var(--primary) 18%, transparent)" }}
			/>

			<main className="relative z-10 mx-auto grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] shadow-[0_20px_50px_-28px_color-mix(in_oklab,var(--foreground)_28%,transparent)] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
				<section className="relative flex flex-col overflow-hidden bg-[var(--sidebar)] p-7 sm:p-10 lg:p-12">
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0"
						style={{
							background:
								"radial-gradient(ellipse at 18% 12%, color-mix(in oklab, var(--accent) 95%, transparent), transparent 58%), radial-gradient(ellipse at 88% 88%, color-mix(in oklab, var(--muted) 80%, transparent), transparent 52%)",
						}}
					/>
					{/* Soft envelope silhouette */}
					<div
						aria-hidden
						className="pointer-events-none absolute -right-8 bottom-10 h-36 w-52 rotate-[-7deg] rounded-2xl border border-[var(--border)] bg-[var(--card)]/75 opacity-80 shadow-sm"
					>
						<div
							className="absolute inset-x-0 top-0 h-0 border-x-[6.5rem] border-t-[3.25rem] border-x-transparent"
							style={{ borderTopColor: "color-mix(in oklab, var(--accent) 85%, var(--primary))" }}
						/>
					</div>

					<div className="relative z-10 flex items-center gap-2.5">
						{brandMark}
						<div className="min-w-0">
							<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
								{eyebrow ?? "Webmail"}
							</p>
							<span className="block truncate text-base font-semibold">{branding.appName}</span>
						</div>
					</div>

					<div className="relative z-10 mt-10 lg:mt-20">
						<h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
							{title}
						</h1>
						{description && (
							<p className="mt-4 max-w-sm text-base leading-7 text-[var(--muted-foreground)]">
								{description}
							</p>
						)}
					</div>
				</section>

				<section className="flex min-w-0 flex-col justify-center p-7 sm:p-10 lg:p-12">
					{steps && (
						<div className="mb-7 flex flex-wrap gap-2 text-xs font-semibold">
							{steps.map((step, index) => (
								<span key={step.label} className="flex items-center gap-2">
									<span
										className={
											step.active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
										}
									>
										{index + 1} {step.label}
									</span>
									{index < steps.length - 1 && <span className="text-[var(--border)]">/</span>}
								</span>
							))}
						</div>
					)}
					<div className="w-full">{children}</div>
					{footer}
				</section>
			</main>
		</div>
	);
}
