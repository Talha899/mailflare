import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { hasAdminAccount } from "@/lib/auth/setup";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth/session";
import { getEnv } from "@/lib/cloudflare";
import { isSaasModeEnabled } from "@/lib/runtime";
import { LoginClient } from "@/app/(auth)/login/login-client";

export const dynamic = "force-dynamic";

/** Admin portal sign-in (and SaaS signup link). Separate from mailbox /login. */
export default async function AdminLoginPage() {
	const env = getEnv();
	const saas = isSaasModeEnabled(env);
	if (!saas && !(await hasAdminAccount(env))) redirect("/setup");
	const cookieStore = await cookies();
	const user = await getUserFromSession(env, cookieStore.get(SESSION_COOKIE)?.value);
	if (user && !user.disabled) {
		redirect(user.role === "admin" ? "/admin" : "/inbox");
	}

	return (
		<AuthGuard mode="public">
			<LoginClient showSignupLink={saas} adminPortal />
		</AuthGuard>
	);
}
