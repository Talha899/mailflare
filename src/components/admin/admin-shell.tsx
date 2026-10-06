"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Mail } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { adminNavSections, type AdminNavLink } from "@/components/admin-nav-links";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authFetch } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const primaryOnlyPrefixes = [
	"/agent",
	"/api-keys",
	"/webhooks",
	"/backups",
	"/branding",
	"/licenses",
	"/activity",
	"/audit-logs",
	"/general",
	"/ai-usage",
];

function linkVisible(
	link: AdminNavLink,
	user: { isPrimaryAdmin?: boolean; canManageDomains?: boolean; canManageUsers?: boolean } | null,
) {
	if (!link.permission) return true;
	if (link.permission === "primary") return !!user?.isPrimaryAdmin;
	if (link.permission === "domains") return !!user?.isPrimaryAdmin || !!user?.canManageDomains;
	if (link.permission === "users") return !!user?.isPrimaryAdmin || !!user?.canManageUsers;
	return true;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const user = useCurrentUser();
	const requirePrimary = primaryOnlyPrefixes.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);

	async function signOut() {
		await authFetch("/api/auth/logout", { method: "POST" });
		window.location.href = "/admin/login";
	}

	return (
		<AuthGuard requireRole="admin" requirePrimary={requirePrimary}>
			<div className="flex h-dvh bg-[var(--background)] text-[var(--foreground)]">
				<aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)] md:flex">
					<div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-4">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
							<LayoutDashboard className="h-4 w-4" />
						</div>
						<div>
							<p className="text-sm font-semibold tracking-tight">Mailflare Admin</p>
							<p className="text-[11px] text-[var(--muted-foreground)]">Infrastructure</p>
						</div>
					</div>
					<nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
						{adminNavSections.map((section) => {
							const links = section.links.filter((link) => linkVisible(link, user));
							if (!links.length) return null;
							return (
								<div key={section.label ?? "main"} className="space-y-1">
									{section.label && (
										<p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
											{section.label}
										</p>
									)}
									{links.map((link) => {
										const Icon = link.icon;
										const active =
											pathname === link.href ||
											(link.href !== "/admin" && pathname.startsWith(`${link.href}/`));
										return (
											<Link
												key={link.href}
												href={link.href}
												className={cn(
													"flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
													active
														? "bg-[var(--muted)] font-medium text-[var(--foreground)]"
														: "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
												)}
											>
												<Icon className="h-4 w-4 shrink-0" />
												{link.label}
											</Link>
										);
									})}
								</div>
							);
						})}
					</nav>
					<div className="space-y-2 border-t border-[var(--border)] p-3">
						<ThemeToggle />
						<button
							type="button"
							onClick={() => void signOut()}
							className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
						>
							<LogOut className="h-4 w-4" />
							Sign out
						</button>
						<Link
							href="/inbox"
							className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
						>
							<Mail className="h-4 w-4" />
							Open webmail
						</Link>
					</div>
				</aside>
				<div className="flex min-w-0 flex-1 flex-col">
					<header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 md:hidden">
						<p className="font-semibold">Admin</p>
						<ThemeToggle />
					</header>
					<main className="min-h-0 flex-1 overflow-y-auto">
						<div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
					</main>
				</div>
			</div>
		</AuthGuard>
	);
}
