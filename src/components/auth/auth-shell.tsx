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
		<span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
			{iconFailed ? (
				<Icon className={`h-5 w-5 ${isAdmin ? "text-[var(--foreground)]" : "text-[var(--primary)]"}`} />
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
			<div className="relative min-h-dvh overflow-hidden bg-[var(--sidebar)] px-4 py-10 text-[var(--foreground)] sm:px-6 lg:px-8">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0"
					style={{
						background:
							"radial-gradient(ellipse 60% 40% at 50% -10%, color-mix(in oklab, var(--muted) 70%, transparent), transparent), radial-gradient(ellipse 50% 35% at 100% 100%, color-mix(in oklab, var(--background) 55%, transparent), transparent)",
					}}
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-[0.35]"
					style={{
						backgroundImage:
							"linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
						backgroundSize: "32px 32px",
						maskImage: "radial-gradient(ellipse at 50% 0%, black 12%, transparent 65%)",
					}}
				/>

				<main className="relative z-10 mx-auto w-full max-w-[420px]">
					<header className="mb-8 flex items-center gap-3 border-b border-[var(--border)] pb-5">
						{brandMark}
						<div className="min-w-0">
							<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
								{eyebrow ?? "Admin console"}
							</p>
							<p className="truncate text-sm font-semibold tracking-tight text-[var(--foreground)]">
								{branding.appName}
							</p>
						</div>
					</header>

					<section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_12px_40px_-24px_color-mix(in_oklab,var(--foreground)_35%,transparent)] sm:p-7">
						<div className="mb-6 border-b border-[var(--border)] pb-5">
							<h1 className="text-xl font-semibold tracking-tight sm:text-[1.35rem]">{title}</h1>
							{description && (
								<p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
							)}
						</div>

						{steps && (
							<div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">
								{steps.map((step, index) => (
									<span key={step.label} className="flex items-center gap-2">
										<span
											className={
												step.active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
											}
										>
											{String(index + 1).padStart(2, "0")} {step.label}
										</span>
										{index < steps.length - 1 && (
											<span className="text-[var(--border)]" aria-hidden>
												/
											</span>
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
		<div className="relative min-h-dvh overflow-hidden bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 lg:flex lg:items-center lg:px-10 lg:py-14">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						"radial-gradient(ellipse 75% 55% at 8% 15%, color-mix(in oklab, var(--muted) 85%, transparent), transparent), radial-gradient(ellipse 60% 50% at 92% 88%, color-mix(in oklab, var(--accent) 70%, transparent), transparent), radial-gradient(ellipse 40% 30% at 50% 50%, color-mix(in oklab, var(--background) 40%, transparent), transparent)",
				}}
			/>

			<main className="relative z-10 mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_24px_60px_-32px_color-mix(in_oklab,var(--foreground)_30%,transparent)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
				<section className="relative flex flex-col overflow-hidden bg-[var(--sidebar)] p-7 sm:p-10 lg:min-h-[34rem] lg:p-12">
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0"
						style={{
							background:
								"linear-gradient(165deg, color-mix(in oklab, var(--muted) 35%, transparent), transparent 55%)",
						}}
					/>
					{/* Folded paper plane mark */}
					<div
						aria-hidden
						className="pointer-events-none absolute -right-6 bottom-8 h-40 w-48 rotate-[-8deg] opacity-90"
					>
						<svg viewBox="0 0 160 120" className="h-full w-full" fill="none">
							<path
								d="M8 72 L72 18 L148 48 L88 102 Z"
								fill="var(--card)"
								stroke="var(--border)"
								strokeWidth="1.5"
							/>
							<path
								d="M72 18 L88 102 L52 68 Z"
								fill="var(--accent)"
								stroke="var(--border)"
								strokeWidth="1.5"
							/>
							<path
								d="M72 18 L148 48"
								stroke="var(--primary)"
								strokeWidth="1.25"
								opacity="0.35"
							/>
						</svg>
					</div>

					<div className="relative z-10 flex items-center gap-3">
						{brandMark}
						<div className="min-w-0">
							<p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
								{eyebrow ?? "Webmail"}
							</p>
							<span className="block truncate text-base font-semibold tracking-tight text-[var(--foreground)]">
								{branding.appName}
							</span>
						</div>
					</div>

					<div className="relative z-10 mt-12 lg:mt-auto lg:pt-24">
						<h1 className="max-w-md text-3xl font-semibold leading-[1.15] tracking-tight text-[var(--foreground)] sm:text-[2.35rem]">
							{title}
						</h1>
						{description && (
							<p className="mt-4 max-w-sm text-[0.95rem] leading-7 text-[var(--muted-foreground)]">
								{description}
							</p>
						)}
					</div>
				</section>

				<section className="flex min-w-0 flex-col justify-center bg-[var(--card)] p-7 sm:p-10 lg:p-12">
					{steps && (
						<div className="mb-7 flex flex-wrap gap-2 text-xs font-medium">
							{steps.map((step, index) => (
								<span key={step.label} className="flex items-center gap-2">
									<span
										className={
											step.active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
										}
									>
										{index + 1} {step.label}
									</span>
									{index < steps.length - 1 && (
										<span className="text-[var(--border)]" aria-hidden>
											/
										</span>
									)}
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
