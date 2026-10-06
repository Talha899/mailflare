"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
	accountSettingsNavItems,
	getAccountSettingsHref,
	isActiveAccountSettingsPath,
} from "./account-settings-nav-utils";

export function AccountSettingsNav() {
	const { id } = useParams<{ id: string }>();
	const pathname = usePathname();

	return (
		<aside className="w-full shrink-0 lg:w-48">
			<div className="sticky top-6 space-y-3">
				<h2 className="px-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
					Account settings
				</h2>
				<nav className="space-y-1">
					{accountSettingsNavItems.map((item) => {
						const href = getAccountSettingsHref(id, item.segment);
						return (
							<Link
								key={item.segment || "details"}
								href={href}
								className={cn(
									"block rounded-md px-3 py-2 text-sm font-medium transition-colors active:scale-[0.98]",
									isActiveAccountSettingsPath(pathname, href)
										? "bg-[var(--muted)] text-[var(--foreground)]"
										: "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60 hover:text-[var(--foreground)]",
								)}
							>
								{item.label}
							</Link>
						);
					})}
				</nav>
			</div>
		</aside>
	);
}
