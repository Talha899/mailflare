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
} from "lucide-react";

export type AdminLinkPermission = "primary" | "domains" | "users";

export type AdminNavLink = {
	href: string;
	label: string;
	icon: typeof Settings;
	permission?: AdminLinkPermission;
};

export const adminNavSections: { label?: string; links: AdminNavLink[] }[] = [
	{
		links: [{ href: "/admin", label: "Overview", icon: Settings }],
	},
	{
		label: "Email",
		links: [
			{ href: "/mailboxes", label: "Mailboxes", icon: Mail },
			{ href: "/domains", label: "Domains", icon: Globe2, permission: "domains" },
			{ href: "/routing", label: "Routing", icon: Route },
			{ href: "/webhooks", label: "Webhooks", icon: Webhook, permission: "primary" },
		],
	},
	{
		label: "Administration",
		links: [
			{ href: "/api-keys", label: "API keys", icon: KeyRound, permission: "primary" },
			{ href: "/general", label: "General", icon: Settings, permission: "primary" },
			{ href: "/agent", label: "Agent", icon: Bot, permission: "primary" },
			{ href: "/accounts", label: "Accounts", icon: Users },
			{ href: "/activity", label: "Activity", icon: Activity, permission: "primary" },
			{ href: "/backups", label: "Backups", icon: DatabaseBackup, permission: "primary" },
		],
	},
	{
		label: "Product",
		links: [{ href: "/branding", label: "Branding", icon: Palette, permission: "primary" }],
	},
];
