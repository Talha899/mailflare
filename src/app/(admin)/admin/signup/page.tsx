import { redirect } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { getEnv } from "@/lib/cloudflare";
import { isSaasModeEnabled } from "@/lib/runtime";
import { SignupClient } from "./signup-client";

export const dynamic = "force-dynamic";

export default function SignupPage() {
	const env = getEnv();
	if (!isSaasModeEnabled(env)) redirect("/setup");

	return (
		<AuthGuard mode="public">
			<SignupClient />
		</AuthGuard>
	);
}
