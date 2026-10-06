"use client";

import Link from "next/link";
import { Bot, Globe2, KeyRound, Mail, Palette, Users } from "lucide-react";
import { AdminUpdateCard } from "@/components/admin-update-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";

type AdminSection = {
	href: string;
	title: string;
	description: string;
	icon: typeof Bot;
	permission?: "primary" | "domains" | "users";
};

const sections: AdminSection[] = [
	{
		href: "/agent",
		title: "Agent",
		description: "Choose the email assistant's AI provider and model.",
		icon: Bot,
		permission: "primary",
	},
	{
		href: "/mailboxes",
		title: "Mailboxes",
		description: "Create mailboxes with IMAP/SMTP/webmail passwords (separate from admin sign-in).",
		icon: Mail,
	},
	{
		href: "/domains",
		title: "Domains",
		description: "Add Cloudflare domains and inspect DNS state.",
		icon: Globe2,
		permission: "domains",
	},
	{
		href: "/branding",
		title: "Branding",
		description: "Customize the app name, icon, and favicon.",
		icon: Palette,
		permission: "primary",
	},
	{
		href: "/accounts",
		title: "Accounts",
		description: "Add and manage user accounts.",
		icon: Users,
	},
	{
		href: "/api-keys",
		title: "Admin API keys",
		description: "Manage API access to domains, accounts, and mailboxes.",
		icon: KeyRound,
		permission: "primary",
	},
];

export default function AdminSettingsPage() {
	const user = useCurrentUser();

	function canSee(section: AdminSection): boolean {
		if (!section.permission) return true;
		if (!user) return false;
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
			<div className="grid gap-3 sm:grid-cols-2">
				{sections.filter(canSee).map((section) => {
					const Icon = section.icon;

					return (
						<Link
							key={section.href}
							href={section.href}
							className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
						>
							<Card className="h-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-[border-color,background-color,transform] duration-150 group-hover:border-[color-mix(in_oklab,var(--border)_55%,var(--foreground))] group-hover:bg-[var(--muted)]/40 group-active:scale-[0.995]">
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
