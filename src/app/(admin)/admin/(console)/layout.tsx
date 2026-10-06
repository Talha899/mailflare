import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth/session";
import { getEnv } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

/**
 * Server-side gate for every admin console page. The APIs behind these pages
 * enforce authorization on their own; this keeps the console itself from ever
 * rendering for a visitor without an admin session (no sign-in, a plain user,
 * or a webmail session, which never carries admin rights).
 */
export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
	const env = getEnv();
	const cookieStore = await cookies();
	const user = await getUserFromSession(env, cookieStore.get(SESSION_COOKIE)?.value);
	// Anything short of an admin-portal session sees the admin sign-in form instead.
	if (!user || user.disabled || user.role !== "admin") redirect("/admin/login");
	return <>{children}</>;
}
