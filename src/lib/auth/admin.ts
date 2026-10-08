import { isNodeRuntime, isSaasModeEnabled } from "@/lib/runtime";
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
 * On a single-tenant install that is the primary admin. Cloudflare SaaS keeps a
 * separate operator org (`org_default`). Self-hosted Node never creates that
 * org — `/admin/signup` mints a tenant — so the primary admin of this box is
 * the operator.
 */
export function isInstanceOwner(
	env: Pick<CloudflareEnv, "SAAS_MODE" | "MAILFLARE_RUNTIME"> | undefined,
	user: Pick<SessionUser, "role" | "isPrimaryAdmin" | "organizationId">,
): boolean {
	if (!isPrimaryAdmin(user)) return false;
	if (!isSaasModeEnabled(env)) return true;
	if (isNodeRuntime(env)) return true;
	return user.organizationId === OPERATOR_ORGANIZATION_ID;
}

export function assertInstanceOwner(
	env: Pick<CloudflareEnv, "SAAS_MODE" | "MAILFLARE_RUNTIME"> | undefined,
	user: Pick<SessionUser, "role" | "isPrimaryAdmin" | "organizationId">,
): void {
	if (!isInstanceOwner(env, user)) {
		throw new Error("Forbidden");
	}
}

/**
 * Overview card: version check and SQLite migrations. On Coolify/Node there is
 * no org_default operator, so a primary admin of the SaaS tenant that runs the
 * box must be able to see the card. GitHub Worker deploys stay instance-owner-only.
 */
export function canManageApplicationUpdate(
	env: Pick<CloudflareEnv, "SAAS_MODE" | "MAILFLARE_RUNTIME"> | undefined,
	user: Pick<SessionUser, "role" | "isPrimaryAdmin" | "organizationId">,
): boolean {
	if (isInstanceOwner(env, user)) return true;
	return isNodeRuntime(env) && isPrimaryAdmin(user);
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
