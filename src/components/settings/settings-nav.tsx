"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActiveSettingsPath, settingsNavSections } from "./settings-nav-utils";

export function SettingsNav() {
	const pathname = usePathname();

	return (
		<aside className="w-full border-b border-[var(--border)] px-4 py-4 md:min-h-full md:w-64 md:border-b-0 md:border-r md:py-10">
			<div className="sticky top-6 space-y-7">
				{settingsNavSections.map((section) => (
					<div key={section.label} className="space-y-3">
						<h2 className="px-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
							{section.label}
						</h2>
						<nav className="space-y-px">
							{section.items.map((item) => {
								const active = isActiveSettingsPath(pathname, item.href);
								return (
									<Link
										key={item.href}
										href={item.href}
										className={cn(
											"block rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
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
