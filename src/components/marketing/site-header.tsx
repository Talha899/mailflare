"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { HomeHeaderActions } from "@/app/home-header-actions";
import { marketingNav } from "@/lib/blog/nav";
import { cn } from "@/lib/utils";

export function MarketingHeader({
	appName,
	iconSrc,
}: {
	appName: string;
	iconSrc: string;
}) {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);

	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	useEffect(() => {
		if (!open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = previous;
			window.removeEventListener("keydown", onKey);
		};
	}, [open]);

	return (
		<header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_88%,transparent)] backdrop-blur">
			<div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
				<Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${appName} home`}>
					<img src={iconSrc} height={32} width={32} alt="" className="h-8 w-8 rounded-md" />
					<span className="truncate text-base font-semibold tracking-tight">{appName}</span>
				</Link>
				<nav className="hidden items-center gap-6 text-sm font-medium text-[var(--muted-foreground)] md:flex">
					{marketingNav.map((item) => {
						const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn("transition-colors hover:text-[var(--foreground)]", active && "text-[var(--foreground)]")}
							>
								{item.label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					<div className="hidden sm:flex sm:items-center sm:gap-2">
						<HomeHeaderActions />
					</div>
					<button
						type="button"
						className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)] md:hidden"
						aria-label={open ? "Close menu" : "Open menu"}
						aria-expanded={open}
						onClick={() => setOpen((value) => !value)}
					>
						{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</button>
				</div>
			</div>
			{open && (
				<div className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 md:hidden">
					<nav className="flex flex-col gap-1">
						{marketingNav.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
							>
								{item.label}
							</Link>
						))}
					</nav>
					<div className="mt-4 flex flex-col gap-2 sm:hidden">
						<HomeHeaderActions />
					</div>
				</div>
			)}
		</header>
	);
}
