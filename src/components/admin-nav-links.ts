import {
	Bot,
	DatabaseBackup,
	Globe2,
	Activity,
	Mail,
	Palette,
	Route,
	Settings,
	Users,
	Webhook,
	KeyRound,
	BadgeCheck,
	LayoutDashboard,
} from "lucide-react";

/** primary: the organization owner. instance: the installation owner (differs in SaaS mode). */
export type AdminLinkPermission = "primary" | "instance" | "domains" | "users";

export type AdminNavLink = {
	href: string;
	label: string;
	icon: typeof Settings;
	permission?: AdminLinkPermission;
};

export const adminNavSections: { label?: string; links: AdminNavLink[] }[] = [
	{
		links: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }],
	},
	{
		label: "Email",
		links: [
			{ href: "/admin/mailboxes", label: "Mailboxes", icon: Mail },
			{ href: "/admin/domains", label: "Domains", icon: Globe2, permission: "domains" },
			{ href: "/admin/routing", label: "Routing", icon: Route },
			{ href: "/admin/webhooks", label: "Webhooks", icon: Webhook, permission: "primary" },
		],
	},
	{
		label: "Administration",
		links: [
			{ href: "/admin/api-keys", label: "API keys", icon: KeyRound, permission: "primary" },
			{ href: "/admin/general", label: "General", icon: Settings, permission: "instance" },
			{ href: "/admin/agent", label: "AI assistant", icon: Bot, permission: "instance" },
			{ href: "/admin/accounts", label: "Accounts", icon: Users },
			{ href: "/admin/activity", label: "Activity", icon: Activity, permission: "instance" },
			{ href: "/admin/backups", label: "Backups", icon: DatabaseBackup, permission: "instance" },
		],
	},
	{
		label: "Installation",
		links: [
			{ href: "/admin/branding", label: "Branding", icon: Palette, permission: "instance" },
			{ href: "/admin/licenses", label: "License", icon: BadgeCheck, permission: "instance" },
		],
	},
];
