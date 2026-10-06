"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { adminNavSections, type AdminNavLink } from "@/components/admin-nav-links";
import { useCurrentUser, type CurrentUser } from "@/hooks/use-current-user";
import { useBranding } from "@/components/branding-provider";
import { authFetch } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";

/** Pages that act on the organization as a whole: its primary admin only. */
const primaryOnlyPrefixes = ["/admin/api-keys", "/admin/webhooks"];

/** Pages that act on the whole installation: the instance owner only (see isInstanceOwner). */
const instanceOnlyPrefixes = [
	"/admin/agent",
	"/admin/backups",
	"/admin/branding",
	"/admin/licenses",
	"/admin/activity",
	"/admin/audit-logs",
	"/admin/general",
	"/admin/ai-usage",
];

function matchesPrefix(pathname: string, prefixes: string[]) {
	return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function linkVisible(link: AdminNavLink, user: CurrentUser | null) {
	if (!link.permission) return true;
	if (link.permission === "instance") return !!user?.isInstanceOwner;
	if (link.permission === "primary") return !!user?.isPrimaryAdmin;
	if (link.permission === "domains") return !!user?.isPrimaryAdmin || !!user?.canManageDomains;
	if (link.permission === "users") return !!user?.isPrimaryAdmin || !!user?.canManageUsers;
	return true;
}

function findActiveLink(pathname: string): AdminNavLink | null {
	let best: AdminNavLink | null = null;
	for (const section of adminNavSections) {
		for (const link of section.links) {
			const matches = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));
			if (matches && (!best || link.href.length > best.href.length)) best = link;
		}
	}
	return best;
}

function AdminNav({ pathname, user, onNavigate }: { pathname: string; user: CurrentUser | null; onNavigate?: () => void }) {
	const active = findActiveLink(pathname);
	return (
		<nav aria-label="Admin" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
			{adminNavSections.map((section) => {
				const links = section.links.filter((link) => linkVisible(link, user));
				if (!links.length) return null;
				return (
					<div key={section.label ?? "main"} className="space-y-0.5">
						{section.label && (
							<p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-sidebar-muted)]">
								{section.label}
							</p>
						)}
						{links.map((link) => {
							const Icon = link.icon;
							const isActive = active?.href === link.href;
							return (
								<Link
									key={link.href}
									href={link.href}
									onClick={onNavigate}
									aria-current={isActive ? "page" : undefined}
									className={cn(
										"group flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
										isActive
											? "bg-[var(--admin-sidebar-active)] font-medium text-white"
											: "text-[var(--admin-sidebar-foreground)] hover:bg-[var(--admin-sidebar-hover)] hover:text-white",
									)}
								>
									<Icon
										className={cn(
											"h-4 w-4 shrink-0",
											isActive ? "text-[var(--primary)]" : "text-[var(--admin-sidebar-muted)] group-hover:text-[var(--admin-sidebar-foreground)]",
										)}
									/>
									{link.label}
								</Link>
							);
						})}
					</div>
				);
			})}
		</nav>
	);
}

function AdminSidebar({
	pathname,
	user,
	appName,
	iconUrl,
	onNavigate,
	onSignOut,
}: {
	pathname: string;
	user: CurrentUser | null;
	appName: string;
	iconUrl: string;
	onNavigate?: () => void;
	onSignOut: () => void;
}) {
	return (
		<div className="flex h-full flex-col bg-[var(--admin-sidebar)] text-[var(--admin-sidebar-foreground)]">
			<div className="flex h-16 items-center gap-3 border-b border-[var(--admin-sidebar-border)] px-5">
				<img src={iconUrl} alt="" width={28} height={28} className="h-7 w-7 rounded-md object-contain" />
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold tracking-tight text-white">{appName}</p>
					<p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--admin-sidebar-muted)]">
						<ShieldCheck className="h-3 w-3" /> Admin console
					</p>
				</div>
			</div>
			<AdminNav pathname={pathname} user={user} onNavigate={onNavigate} />
			<div className="space-y-3 border-t border-[var(--admin-sidebar-border)] p-3">
				{user && (
					<div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
						<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--admin-sidebar-active)] text-xs font-semibold uppercase text-white">
							{(user.name || user.email).slice(0, 1)}
						</span>
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium text-white">{user.name || "Administrator"}</p>
							<p className="truncate text-xs text-[var(--admin-sidebar-muted)]">{user.email}</p>
						</div>
					</div>
				)}
				<button
					type="button"
					onClick={onSignOut}
					className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-[var(--admin-sidebar-foreground)] transition-colors hover:bg-[var(--admin-sidebar-hover)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
				>
					<LogOut className="h-4 w-4 text-[var(--admin-sidebar-muted)]" />
					Sign out
				</button>
			</div>
		</div>
	);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const user = useCurrentUser();
	const branding = useBranding();
	const [navOpen, setNavOpen] = useState(false);
	const requirePrimary = matchesPrefix(pathname, primaryOnlyPrefixes) || matchesPrefix(pathname, instanceOnlyPrefixes);
	const instanceOnly = matchesPrefix(pathname, instanceOnlyPrefixes);
	const activeLink = findActiveLink(pathname);

	useEffect(() => {
		setNavOpen(false);
	}, [pathname]);

	useEffect(() => {
		if (!navOpen) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setNavOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = previous;
			window.removeEventListener("keydown", onKey);
		};
	}, [navOpen]);

	async function signOut() {
		await authFetch("/api/auth/logout", { method: "POST" });
		window.location.href = "/admin/login";
	}

	const sidebarProps = {
		pathname,
		user,
		appName: branding.appName,
		iconUrl: branding.iconUrl,
		onSignOut: () => void signOut(),
	};

	return (
		<AuthGuard requireRole="admin" requirePrimary={requirePrimary}>
			<div className="flex h-dvh bg-[var(--background)] text-[var(--foreground)]">
				<aside className="hidden w-64 shrink-0 md:block">
					<AdminSidebar {...sidebarProps} />
				</aside>

				{navOpen && (
					<div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
						<button
							type="button"
							className="fade-in absolute inset-0 bg-[var(--overlay)]"
							aria-label="Close admin menu"
							onClick={() => setNavOpen(false)}
						/>
						<div className="drawer-in relative h-full w-[min(18rem,calc(100vw-3rem))] shadow-[var(--shadow-lg)]">
							<AdminSidebar {...sidebarProps} onNavigate={() => setNavOpen(false)} />
						</div>
					</div>
				)}

				<div className="flex min-w-0 flex-1 flex-col">
					<header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 sm:px-6">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="md:hidden"
							aria-label={navOpen ? "Close admin menu" : "Open admin menu"}
							aria-expanded={navOpen}
							onClick={() => setNavOpen((open) => !open)}
						>
							{navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
						</Button>
						<div className="min-w-0 flex-1">
							<p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--subtle-foreground)]">Admin</p>
							<p className="truncate text-[15px] font-semibold tracking-tight">{activeLink?.label ?? "Console"}</p>
						</div>
						<ThemeToggle className="shrink-0" />
					</header>
					<main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
						<div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
							{instanceOnly && user && !user.isInstanceOwner ? (
								<EmptyState
									icon={ShieldCheck}
									title="Managed by the installation owner"
									description="This setting applies to every organization on this installation, so only its owner can change it."
								/>
							) : (
								children
							)}
						</div>
					</main>
				</div>
			</div>
		</AuthGuard>
	);
}
