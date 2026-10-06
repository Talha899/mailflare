"use client";

import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { NavItem } from "./components-nav";
import { SidebarFooter } from "./sidebar-footer";
import { useBranding } from "./branding-provider";
import { SidebarHeader } from "./sidebar-header";
import { useSidebar } from "./sidebar-state";
import { adminNavSections, type AdminNavLink } from "./admin-nav-links";

/** @deprecated Prefer {@link DashboardNav} — admin links are merged into the mail sidebar. */
export function AdminNav({ className }: { className?: string }) {
	const branding = useBranding();
	const { minimal } = useSidebar();
	const user = useCurrentUser();

	function canSee(link: AdminNavLink): boolean {
		if (link.href === "/licenses") return false;
		if (link.href === "/branding" && !branding.canCustomizeBranding) return false;
		if (!link.permission) return true;
		if (!user) return false;
		if (link.permission === "primary") return user.isPrimaryAdmin;
		if (link.permission === "domains") return user.isPrimaryAdmin || user.canManageDomains;
		return user.isPrimaryAdmin || user.canManageUsers;
	}

	return (
		<nav className={cn("flex min-h-full flex-col gap-1", className)}>
			<SidebarHeader href="/inbox" label="Admin" />
			<div className={cn("space-y-4", minimal && "space-y-2 pl-1")}>
				{adminNavSections.map((section, sectionIndex) => {
					const links = section.links.filter(canSee);
					if (links.length === 0) return null;

					return (
						<section key={section.label ?? links[0].href}>
							{minimal && sectionIndex > 0 && <hr className="mx-3 mb-3 border-[var(--border)]/70" />}
							{!minimal && section.label && (
								<p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
									{section.label}
								</p>
							)}
							<div className="space-y-1">
								{links.map((link) => (
									<NavItem link={link} key={link.href} />
								))}
							</div>
						</section>
					);
				})}
			</div>
			<span className="flex-1" />
			<SidebarFooter />
		</nav>
	);
}
