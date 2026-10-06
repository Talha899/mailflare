export type UserRole = "admin" | "user";

export type SessionUser = {
	id: string;
	email: string;
	resetEmail: string | null;
	forwardingEmail: string | null;
	passwordHash: string;
	name: string;
	timeZone: string | null;
	role: UserRole;
	isPrimaryAdmin: boolean;
	disabled: boolean;
	canManageMailboxes: boolean;
	canManageDomains: boolean;
	canManageUsers: boolean;
	keyboardShortcutsEnabled: boolean;
	spamProtectionEnabled: boolean;
	showFullRecipientAddresses: boolean;
	/** SaaS tenant id; org_default on classic single-tenant installs. */
	organizationId: string;
	createdByUserId: string | null;
	createdAt: Date;
	/** How the current session was signed in; absent for API-key callers. */
	sessionScope?: "account" | "admin" | "mailbox";
	/** Set on webmail sessions: the only owned mailbox the session may open. */
	sessionMailboxId?: string | null;
};
