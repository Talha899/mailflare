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
}: AuthShellProps) {
	const branding = useBranding();
	const [iconUrl, setIconUrl] = useState(branding.iconUrl);
	const [iconFailed, setIconFailed] = useState(false);

	useEffect(() => {
		setIconUrl(branding.iconUrl);
		setIconFailed(false);
	}, [branding.iconUrl]);

	return (
		<div className="min-h-dvh bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:flex lg:items-center lg:px-10 lg:py-10">
			<main className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
				<section className="relative flex flex-col overflow-hidden bg-[var(--sidebar)] p-7 sm:p-10 lg:p-12">
					<div
						className="pointer-events-none absolute inset-0 opacity-40"
						style={{
							background:
								"radial-gradient(ellipse at 20% 10%, var(--accent), transparent 55%), radial-gradient(ellipse at 90% 80%, var(--muted), transparent 50%)",
						}}
					/>
					<div className="relative z-10 flex items-center gap-2">
						<span className="flex items-center justify-center overflow-hidden">
							{iconFailed ? (
								<Icon className="h-8 w-8 text-[var(--primary)]" />
							) : (
								<img
									src={iconUrl}
									onError={() => {
										if (iconUrl !== "/icon-96.png") setIconUrl("/icon-96.png");
										else setIconFailed(true);
									}}
									alt=""
									className="h-8 w-8 object-contain"
								/>
							)}
						</span>
						<span className="truncate text-md font-semibold">{branding.appName}</span>
					</div>

					<div className="relative z-10 mt-8 lg:mt-16">
						<h1 className="max-w-md text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
							{title}
						</h1>
						{description && (
							<p className="mt-4 max-w-md text-base leading-7 text-[var(--muted-foreground)]">
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
									<span className={step.active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}>
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
