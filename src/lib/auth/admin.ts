import { isSaasModeEnabled } from "@/lib/runtime";
import type { SessionUser } from "./types";

/** Same value as DEFAULT_ORGANIZATION_ID; inlined so this module stays free of the Mongo service. */
const OPERATOR_ORGANIZATION_ID = "org_default";

export function isAdmin(user: Pick<SessionUser, "role">): boolean {
	return user.role === "admin";
}

export function assertAdmin(user: Pick<SessionUser, "role">): void {
	if (!isAdmin(user)) {
		throw new Error("Forbidden");
	}
}

/**
 * The primary admin is the single account created during setup. Only it can
 * manage other admins and reach owner-only administration pages.
 */
export function isPrimaryAdmin(
	user: Pick<SessionUser, "role" | "isPrimaryAdmin">,
): boolean {
	return user.role === "admin" && user.isPrimaryAdmin;
}

export function assertPrimaryAdmin(
	user: Pick<SessionUser, "role" | "isPrimaryAdmin">,
): void {
	if (!isPrimaryAdmin(user)) {
		throw new Error("Forbidden");
	}
}

/**
 * The instance owner runs the whole installation: backups and restore, branding,
 * licenses, audit logs, global AI settings and updates all act on every tenant.
 * On a single-tenant install that is the primary admin. In SaaS mode every
 * signup becomes the primary admin of its own organization, so only the primary
 * admin of the operator's default organization qualifies.
 */
export function isInstanceOwner(
	env: Pick<CloudflareEnv, "SAAS_MODE"> | undefined,
	user: Pick<SessionUser, "role" | "isPrimaryAdmin" | "organizationId">,
): boolean {
	if (!isPrimaryAdmin(user)) return false;
	if (!isSaasModeEnabled(env)) return true;
	return user.organizationId === OPERATOR_ORGANIZATION_ID;
}

export function assertInstanceOwner(
	env: Pick<CloudflareEnv, "SAAS_MODE"> | undefined,
	user: Pick<SessionUser, "role" | "isPrimaryAdmin" | "organizationId">,
): void {
	if (!isInstanceOwner(env, user)) {
		throw new Error("Forbidden");
	}
}

/** Domains can be managed by the primary admin or an admin the primary granted it to. */
export function canManageDomains(
	user: Pick<SessionUser, "role" | "isPrimaryAdmin" | "canManageDomains">,
): boolean {
	return isPrimaryAdmin(user) || (user.role === "admin" && user.canManageDomains);
}

/** User accounts can be managed by the primary admin or an admin the primary granted it to. */
export function canManageUsers(
	user: Pick<SessionUser, "role" | "isPrimaryAdmin" | "canManageUsers">,
): boolean {
	return isPrimaryAdmin(user) || (user.role === "admin" && user.canManageUsers);
}
