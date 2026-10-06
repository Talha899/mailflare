import { NextResponse } from "next/server";
import type { SessionUser } from "./types";

/** True for a webmail session: signed in with one mailbox's password. */
export function isMailboxSession(user: Pick<SessionUser, "sessionScope">): boolean {
	return user.sessionScope === "mailbox";
}

/**
 * Account-wide settings (account password, recovery email, account forwarding,
 * two-factor) protect every mailbox the account owns and the admin portal. A
 * mailbox password must not be able to change them, or one mailbox's password
 * would become the whole account.
 */
export function rejectMailboxSession(user: Pick<SessionUser, "sessionScope">): NextResponse | null {
	if (!isMailboxSession(user)) return null;
	return NextResponse.json(
		{ error: "This setting belongs to your account. Sign in with your account password to change it." },
		{ status: 403 },
	);
}
