"use client";

import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useBranding } from "./branding-provider";
import { NavItem } from "./components-nav";
import { useSidebar } from "./sidebar-state";
import { adminNavSections, type AdminNavLink } from "./admin-nav-links";

/** Workspace admin links shown below mail folders in the unified sidebar. */
export function AdminSidebarSection({ className }: { className?: string }) {
	const branding = useBranding();
	const { minimal } = useSidebar();
	const user = useCurrentUser();

	if (user?.role !== "admin") return null;

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
		<div className={cn("mt-2 border-t border-neutral-200/70 pt-2", className)}>
			{adminNavSections.map((section, sectionIndex) => {
				const links = section.links.filter(canSee);
				if (links.length === 0) return null;

				return (
					<section key={section.label ?? links[0].href} className={sectionIndex > 0 ? "mt-2" : undefined}>
						{minimal && sectionIndex > 0 && <hr className="mx-3 mb-2 border-neutral-200/70" />}
						{!minimal && section.label && (
							<p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
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
	);
}
