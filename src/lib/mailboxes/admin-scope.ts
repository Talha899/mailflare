import type { SessionUser } from "@/lib/auth/types";

/** Admin console (not webmail) may manage every mailbox in the organization. */
export function canAdministerOrganizationMailboxes(
	user: Pick<SessionUser, "role" | "sessionScope">,
): boolean {
	return user.role === "admin" && user.sessionScope !== "mailbox";
}
