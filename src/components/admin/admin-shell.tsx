"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { adminNavSections, type AdminNavLink } from "@/components/admin-nav-links";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useBranding } from "@/components/branding-provider";
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
	const branding = useBranding();
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
				<aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] md:flex">
					<div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4">
						<img
							src={branding.iconUrl}
							alt=""
							width={32}
							height={32}
							className="h-8 w-8 rounded-md border border-[var(--border)] object-contain"
						/>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold tracking-tight">
								{branding.appName} Admin
							</p>
						</div>
					</div>
					<nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
						{adminNavSections.map((section) => {
							const links = section.links.filter((link) => linkVisible(link, user));
							if (!links.length) return null;
							return (
								<div key={section.label ?? "main"} className="space-y-0.5">
									{section.label && (
										<p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
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
													"flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors active:scale-[0.98]",
													active
														? "bg-[var(--primary)] font-medium text-[var(--primary-foreground)]"
														: "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
												)}
											>
												<Icon className="h-4 w-4 shrink-0 opacity-80" />
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
							className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] active:scale-[0.98]"
						>
							<LogOut className="h-4 w-4" />
							Sign out
						</button>
					</div>
				</aside>
				<div className="flex min-w-0 flex-1 flex-col">
					<header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 md:hidden">
						<div className="flex items-center gap-2">
							<img src={branding.iconUrl} alt="" width={24} height={24} className="h-6 w-6" />
							<p className="font-semibold tracking-tight">Admin</p>
						</div>
						<ThemeToggle />
					</header>
					<main className="min-h-0 flex-1 overflow-y-auto bg-[var(--background)]">
						<div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
					</main>
				</div>
			</div>
		</AuthGuard>
	);
}
