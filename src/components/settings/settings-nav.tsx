"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActiveSettingsPath, settingsNavSections } from "./settings-nav-utils";

export function SettingsNav() {
	const pathname = usePathname();

	return (
		<aside className="w-full border-b border-[var(--border)] px-4 py-4 md:min-h-full md:w-60 md:border-b-0 md:border-r md:bg-[var(--sidebar)] md:py-8">
			<div className="sticky top-6 space-y-6">
				{settingsNavSections.map((section) => (
					<div key={section.label} className="space-y-1.5">
						<h2 className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
							{section.label}
						</h2>
						<nav className="space-y-0.5">
							{section.items.map((item) => {
								const active = isActiveSettingsPath(pathname, item.href);
								return (
									<Link
										key={item.href}
										href={item.href}
										className={cn(
											"block rounded-lg px-3 py-2 text-sm font-medium transition-colors active:scale-[0.98]",
											active
												? "bg-[var(--accent)] text-[var(--primary)]"
												: "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
										)}
									>
										{item.label}
									</Link>
								);
							})}
						</nav>
					</div>
				))}
			</div>
		</aside>
	);
}
