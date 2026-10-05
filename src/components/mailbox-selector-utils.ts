import type { MailboxOption } from "./mailbox-provider";

export function getMailboxAddress(mailbox: MailboxOption): string {
	return `${mailbox.localPart}@${mailbox.hostname}`;
}

export function getMailboxName(mailbox: MailboxOption): string {
	return mailbox.displayName ?? mailbox.localPart;
}

export function getAccountInitial(value: string): string {
	return value.trim().slice(0, 1).toUpperCase() || "M";
}

export function isAdminPath(pathname: string): boolean {
	const adminPrefixes = [
		"/admin",
		"/mailboxes",
		"/domains",
		"/routing",
		"/webhooks",
		"/api-keys",
		"/general",
		"/agent",
		"/accounts",
		"/activity",
		"/backups",
		"/branding",
		"/audit-logs",
		"/ai-usage",
		"/licenses",
	];
	return adminPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
