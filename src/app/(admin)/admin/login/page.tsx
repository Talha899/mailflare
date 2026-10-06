import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { hasAdminAccount } from "@/lib/auth/setup";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth/session";
import { getEnv } from "@/lib/cloudflare";
import { isSaasModeEnabled } from "@/lib/runtime";
import { AdminLoginClient } from "./admin-login-client";

export const dynamic = "force-dynamic";

/** Admin console sign-in (and SaaS signup link). Separate product surface from mailbox /login. */
export default async function AdminLoginPage() {
	const env = getEnv();
	const saas = isSaasModeEnabled(env);
	if (!saas && !(await hasAdminAccount(env))) redirect("/setup");
	const cookieStore = await cookies();
	const user = await getUserFromSession(env, cookieStore.get(SESSION_COOKIE)?.value);
	// Only an admin-portal session skips the form. A webmail session (even for an
	// admin's own mailbox) carries no admin rights, so it signs in here separately.
	if (user && !user.disabled && user.role === "admin") redirect("/admin");

	return (
		<AuthGuard mode="public">
			<AdminLoginClient showSignupLink={saas} />
		</AuthGuard>
	);
}
