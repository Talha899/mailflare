import { persistAuthSession } from "@/lib/auth/client";
import type { LoginResult } from "./types";

export async function submitLogin(
	form: FormData,
	options?: { adminPortal?: boolean },
): Promise<{ ok: boolean; data: LoginResult }> {
	const res = await fetch("/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		signal: AbortSignal.timeout(20_000),
		body: JSON.stringify({
			email: form.get("email"),
			password: form.get("password"),
			...(options?.adminPortal ? { adminPortal: true } : {}),
		}),
	});

	return {
		ok: res.ok,
		data: (await persistAuthSession(res)) as LoginResult,
	};
}

/** Second step: the challenge from the password step plus a TOTP or recovery code. */
export async function submitMfaCode(
	challengeToken: string,
	code: string,
	options?: { adminPortal?: boolean },
): Promise<{ ok: boolean; data: LoginResult }> {
	const res = await fetch("/api/auth/mfa/verify", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		signal: AbortSignal.timeout(20_000),
		body: JSON.stringify({
			challengeToken,
			code,
			...(options?.adminPortal ? { adminPortal: true } : {}),
		}),
	});
	return { ok: res.ok, data: (await persistAuthSession(res)) as LoginResult };
}

/** Map API errors to portal-specific copy so mailbox vs admin never imply the other system. */
export function formatLoginError(
	error: string | undefined,
	portal: "mailbox" | "admin",
): string {
	if (!error) {
		return portal === "admin" ? "Admin console sign-in failed" : "Mailbox sign-in failed";
	}
	if (error === "Invalid credentials") {
		return portal === "admin"
			? "Wrong admin email or password."
			: "Wrong mailbox email or password.";
	}
	if (error === "Admin access required") {
		return "This account cannot open the admin console.";
	}
	if (error === "Account disabled") {
		return portal === "admin"
			? "This admin account is disabled."
			: "This mailbox is disabled.";
	}
	return error;
}

export function formatLoginNetworkError(error: unknown, portal: "mailbox" | "admin"): string {
	if (error instanceof DOMException && error.name === "TimeoutError") {
		return portal === "admin"
			? "Admin console sign-in timed out. Please try again."
			: "Mailbox sign-in timed out. Please try again.";
	}
	return portal === "admin"
		? "Unable to reach the admin console. Please try again."
		: "Unable to reach webmail sign-in. Please try again.";
}
