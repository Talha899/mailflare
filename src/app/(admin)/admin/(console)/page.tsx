"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Bot, Globe2, KeyRound, Mail, Palette, TriangleAlert, Users } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminUpdateCard } from "@/components/admin-update-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";

type AdminSection = {
	href: string;
	title: string;
	description: string;
	icon: typeof Bot;
	permission?: "primary" | "instance" | "domains" | "users";
};

const sections: AdminSection[] = [
	{
		href: "/admin/agent",
		title: "AI assistant",
		description: "Choose the email assistant's AI provider and model.",
		icon: Bot,
		permission: "instance",
	},
	{
		href: "/admin/mailboxes",
		title: "Mailboxes",
		description: "Create mailboxes with IMAP/SMTP/webmail passwords (separate from admin sign-in).",
		icon: Mail,
	},
	{
		href: "/admin/domains",
		title: "Domains",
		description: "Add domains and publish MX, SPF, and DKIM records by hand.",
		icon: Globe2,
		permission: "domains",
	},
	{
		href: "/admin/branding",
		title: "Branding",
		description: "Customize the app name, icon, and favicon.",
		icon: Palette,
		permission: "instance",
	},
	{
		href: "/admin/accounts",
		title: "Accounts",
		description: "Add and manage user accounts.",
		icon: Users,
	},
	{
		href: "/admin/api-keys",
		title: "Admin API keys",
		description: "Manage API access to domains, accounts, and mailboxes.",
		icon: KeyRound,
		permission: "primary",
	},
];

type OverviewStats = { domains: number; pendingDomains: number; mailboxes: number; accounts: number | null };

async function fetchJson<T>(url: string): Promise<T | null> {
	const response = await authFetch(url, { redirectOnUnauthorized: false });
	return response.ok ? ((await response.json()) as T) : null;
}

/** Counts from the endpoints the console already uses; accounts need a Team license, so they may be absent. */
async function fetchOverviewStats(includeAccounts: boolean): Promise<OverviewStats> {
	const [domains, mailboxes, accounts] = await Promise.all([
		fetchJson<{ domains?: Array<{ status?: string }> }>("/api/domains"),
		fetchJson<{ mailboxes?: unknown[] }>("/api/mailboxes"),
		includeAccounts ? fetchJson<{ accounts?: unknown[] }>("/api/accounts") : Promise.resolve(null),
	]);
	const domainList = domains?.domains ?? [];
	return {
		domains: domainList.length,
		pendingDomains: domainList.filter((domain) => domain.status && domain.status !== "active").length,
		mailboxes: mailboxes?.mailboxes?.length ?? 0,
		accounts: accounts?.accounts ? accounts.accounts.length : null,
	};
}

function StatCard({ label, value, href, hint, tone = "default" }: { label: string; value: number | null | undefined; href: string; hint?: string; tone?: "default" | "warning" }) {
	return (
		<Link
			href={href}
			className="group relative flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
		>
			<span className="flex items-center justify-between text-xs font-medium text-[var(--muted-foreground)]">
				{label}
				<ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
			</span>
			{value === undefined ? (
				<Skeleton className="h-7 w-12" />
			) : (
				<span className={tone === "warning" && value ? "text-2xl font-semibold tabular-nums text-[var(--warning)]" : "text-2xl font-semibold tabular-nums"}>
					{value ?? "—"}
				</span>
			)}
			{hint && <span className="text-xs text-[var(--subtle-foreground)]">{hint}</span>}
		</Link>
	);
}

export default function AdminSettingsPage() {
	const user = useCurrentUser();
	const includeAccounts = !!user?.canManageAccounts;
	const stats = useQuery({
		queryKey: ["admin-overview-stats", includeAccounts],
		queryFn: () => fetchOverviewStats(includeAccounts),
		enabled: !!user,
		staleTime: 30_000,
	});

	function canSee(section: AdminSection): boolean {
		if (!section.permission) return true;
		if (!user) return false;
		if (section.permission === "instance") return !!user.isInstanceOwner;
		if (section.permission === "primary") return user.isPrimaryAdmin;
		if (section.permission === "domains") return user.isPrimaryAdmin || user.canManageDomains;
		return user.isPrimaryAdmin || user.canManageUsers;
	}

	return (
		<div>
			<div className="mb-7">
				<h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
					Overview
				</h1>
				<p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]">
					Manage domains, mailboxes, and mail infrastructure for your organization.
				</p>
			</div>
			<section aria-label="At a glance" className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard label="Domains" value={stats.data?.domains} href="/admin/domains" />
				<StatCard label="Awaiting DNS" value={stats.data?.pendingDomains} href="/admin/domains" tone="warning" hint={stats.data?.pendingDomains ? "Finish DNS to receive mail" : "All domains verified"} />
				<StatCard label="Mailboxes" value={stats.data?.mailboxes} href="/admin/mailboxes" />
				<StatCard label="Accounts" value={stats.data ? stats.data.accounts : undefined} href="/admin/accounts" hint={stats.data && stats.data.accounts === null ? "Team license required" : undefined} />
			</section>
			{stats.data && stats.data.pendingDomains > 0 && (
				<Link href="/admin/domains" className="mb-8 flex items-center gap-3 rounded-xl border border-[color-mix(in_oklab,var(--warning)_30%,transparent)] bg-[var(--warning-soft)] px-4 py-3 text-sm hover:border-[var(--warning)]">
					<TriangleAlert className="h-4 w-4 shrink-0 text-[var(--warning)]" />
					<span className="flex-1">{stats.data.pendingDomains === 1 ? "One domain is" : `${stats.data.pendingDomains} domains are`} waiting for DNS records. Mail to {stats.data.pendingDomains === 1 ? "it" : "them"} won’t be delivered until they verify.</span>
					<span className="font-medium text-[var(--foreground)]">Review</span>
				</Link>
			)}
			<h2 className="mb-3 text-sm font-semibold text-[var(--muted-foreground)]">Manage</h2>
			<div className="grid gap-3 sm:grid-cols-2">
				{sections.filter(canSee).map((section) => {
					const Icon = section.icon;

					return (
						<Link
							key={section.href}
							href={section.href}
							className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
						>
							<Card className="h-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-[border-color,background-color] duration-150 group-hover:border-[var(--border-strong)] group-hover:bg-[var(--hover)]">
								<CardHeader className="flex-row items-start gap-3.5 space-y-0 py-0">
									<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] transition-colors group-hover:bg-[var(--card)]">
										<Icon className="h-4 w-4" strokeWidth={1.75} />
									</div>
									<div className="min-w-0 space-y-1">
										<CardTitle className="text-[15px] font-semibold tracking-tight">
											{section.title}
										</CardTitle>
										<CardContent className="p-0">
											<p className="text-[13px] leading-relaxed text-[var(--muted-foreground)]">
												{section.description}
											</p>
										</CardContent>
									</div>
								</CardHeader>
							</Card>
						</Link>
					);
				})}
			</div>
			{user?.isPrimaryAdmin && (
				<div className="mt-8">
					<AdminUpdateCard />
				</div>
			)}
		</div>
	);
}
