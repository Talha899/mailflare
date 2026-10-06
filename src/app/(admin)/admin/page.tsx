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
			<div className="mb-8">
				<h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
				<p className="mt-2 text-sm text-[var(--muted-foreground)]">
					Manage domains, mailboxes, and mail infrastructure for your organization.
				</p>
			</div>
			<div className="grid gap-4 lg:grid-cols-2">
				{sections.filter(canSee).map((section) => {
					const Icon = section.icon;

					return (
						<Link key={section.href} href={section.href}>
							<Card className="h-full rounded-3xl border-0 bg-[var(--card)] p-6 transition-colors hover:bg-[var(--accent)]/60">
								<CardHeader className="flex-row items-center gap-4 space-y-0 py-0">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--primary)]">
										<Icon className="h-5 w-5" />
									</div>
									<CardTitle className="text-base">{section.title}</CardTitle>
								</CardHeader>
								<CardContent className="pt-4">
									<p className="text-sm text-[var(--muted-foreground)]">{section.description}</p>
								</CardContent>
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
