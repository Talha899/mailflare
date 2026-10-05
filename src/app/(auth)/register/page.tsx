import { redirect } from "next/navigation";
import { getEnv } from "@/lib/cloudflare";
import { isSaasModeEnabled } from "@/lib/runtime";

export default function RegisterPage() {
	const env = getEnv();
	if (isSaasModeEnabled(env)) redirect("/signup");
	redirect("/setup");
}
