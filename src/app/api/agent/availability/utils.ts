import { getEnv } from "@/lib/cloudflare";
import { getCurrentUser } from "@/lib/auth/cookies";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";
import { getDb } from "@/db";
import {
	getAgentEnabled,
	isAgentProviderConfigured,
	isAssistantAvailableForMailbox,
	isMailboxAgentEnabled,
} from "@/lib/agent/provider";

export async function GET(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

	const mailboxId = new URL(request.url).searchParams.get("mailboxId")?.trim() || null;
	const configured = await isAgentProviderConfigured(env);
	const globallyEnabled = await getAgentEnabled(env);

	if (!mailboxId) {
		return Response.json(
			{
				enabled: globallyEnabled && configured,
				configured,
				globallyEnabled,
				mailboxEnabled: null,
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
	}

	const access = await getMailboxAccessLevel(getDb(env), user, mailboxId);
	if (!access?.canRead) {
		return Response.json(
			{
				enabled: false,
				configured,
				globallyEnabled,
				mailboxEnabled: false,
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
	}

	const mailboxEnabled = await isMailboxAgentEnabled(env, mailboxId);
	const enabled = await isAssistantAvailableForMailbox(env, mailboxId);
	return Response.json(
		{ enabled, configured, globallyEnabled, mailboxEnabled },
		{ headers: { "Cache-Control": "no-store" } },
	);
}
