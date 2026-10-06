import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/cookies";
import { isInstanceOwner } from "@/lib/auth/admin";
import { getEnv } from "@/lib/cloudflare";
import { hasPrimaryDomain, userHasMailboxes } from "@/lib/user";
import { getLicenseEntitlements } from "@/lib/licenses/service";
import { hasCloudflareCredentials, isNodeRuntime, isSaasModeEnabled } from "@/lib/runtime";

export async function GET(request: Request) {
	const env = getEnv();
	const user = await getCurrentUser(env, request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let hasMailboxes = false;
	let isSetup = true;
	const entitlements = await getLicenseEntitlements(env);
	try {
		[hasMailboxes, isSetup] = await Promise.all([
			userHasMailboxes(env, user.id),
			hasPrimaryDomain(env, user.organizationId),
		]);
	} catch {
		// Authentication remains valid when optional mailbox/setup metadata is unavailable.
	}
	return NextResponse.json({
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			timeZone: user.timeZone,
			resetEmail: user.resetEmail,
			forwardingEmail: user.forwardingEmail,
			canForwardEmail: entitlements.canForwardEmail,
			/** Whether account management is available (Team license, or SaaS mode). */
			canManageAccounts: entitlements.canManageAccounts || isSaasModeEnabled(env),
			role: user.role,
			isPrimaryAdmin: user.isPrimaryAdmin,
			isInstanceOwner: isInstanceOwner(env, user),
			sessionScope: user.sessionScope,
			canManageMailboxes: user.canManageMailboxes,
			canManageDomains: user.canManageDomains,
			canManageUsers: user.canManageUsers,
			keyboardShortcutsEnabled: user.keyboardShortcutsEnabled,
			spamProtectionEnabled: user.spamProtectionEnabled,
			showFullRecipientAddresses: user.showFullRecipientAddresses,
			organizationId: user.organizationId,
			hasAvatar: !!user.avatarKey,
			mfaEnabled: user.totpEnabled,
		},
		runtime: isNodeRuntime(env) ? "node" : "cloudflare",
		saasMode: isSaasModeEnabled(env),
		managesDns: hasCloudflareCredentials(env),
		hasMailboxes,
		isSetup,
	});
}
