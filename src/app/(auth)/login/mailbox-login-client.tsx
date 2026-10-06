"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Inbox, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	formatLoginError,
	formatLoginNetworkError,
	submitLogin,
	submitMfaCode,
} from "./utils";

export function MailboxLoginClient() {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [challengeToken, setChallengeToken] = useState<string | null>(null);
	const [code, setCode] = useState("");

	function finish(redirect?: string) {
		router.replace(redirect ?? "/inbox");
		router.refresh();
	}

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const { ok, data } = await submitLogin(new FormData(e.currentTarget));
			if (!ok) {
				setError(formatLoginError(data.error, "mailbox"));
				return;
			}
			if (data.mfaRequired && data.challengeToken) {
				setChallengeToken(data.challengeToken);
				return;
			}
			finish(data.redirect);
		} catch (err) {
			setError(formatLoginNetworkError(err, "mailbox"));
		} finally {
			setLoading(false);
		}
	}

	async function onSubmitCode(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!challengeToken) return;
		setLoading(true);
		setError(null);
		try {
			const { ok, data } = await submitMfaCode(challengeToken, code);
			if (!ok) {
				setError(data.error ?? "That code did not match");
				if (data.error?.includes("expired")) {
					setChallengeToken(null);
					setCode("");
				}
				return;
			}
			finish(data.redirect);
		} catch {
			setError("Unable to reach webmail sign-in. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	if (challengeToken) {
		return (
			<AuthShell
				variant="mailbox"
				icon={ShieldCheck}
				title="Confirm it’s you"
				description="Enter the 6-digit code from your authenticator app, or one of your recovery codes."
				steps={[
					{ label: "Mailbox", active: false },
					{ label: "Verify", active: true },
				]}
			>
				<form onSubmit={onSubmitCode} className="space-y-5">
					<div className="space-y-2">
						<Label htmlFor="code">Verification code</Label>
						<Input
							id="code"
							name="code"
							value={code}
							onChange={(event) => setCode(event.target.value)}
							inputMode="numeric"
							autoComplete="one-time-code"
							autoFocus
							placeholder="123 456"
							required
						/>
					</div>
					{error && (
						<p className="rounded-xl border border-[var(--destructive)]/25 bg-[var(--destructive)]/10 px-4 py-3 text-sm font-medium text-[var(--destructive)]">
							{error}
						</p>
					)}
					<Button type="submit" className="h-11 w-full rounded-xl px-6 active:scale-[0.98]" disabled={loading}>
						{loading ? "Verifying..." : "Open inbox"}
					</Button>
					<button
						type="button"
						className="w-full text-center text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
						onClick={() => {
							setChallengeToken(null);
							setCode("");
							setError(null);
						}}
					>
						Back to mailbox sign-in
					</button>
				</form>
			</AuthShell>
		);
	}

	return (
		<AuthShell
			variant="mailbox"
			icon={Inbox}
			title="Open your inbox"
			description="Use your mailbox address and mailbox password (IMAP/SMTP use the same password). This is not your admin account password."
		>
			<form method="post" onSubmit={onSubmit} className="space-y-5">
				<div className="space-y-2">
					<Label htmlFor="email">Mailbox email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autoComplete="username"
						placeholder="you@your-domain.com"
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="password">Mailbox password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autoComplete="current-password"
						required
					/>
					<p className="text-xs text-[var(--muted-foreground)]">
						Same password used for IMAP/SMTP. Ask an admin if you need it reset.
					</p>
				</div>
				{error && (
					<p className="rounded-xl border border-[var(--destructive)]/25 bg-[var(--destructive)]/10 px-4 py-3 text-sm font-medium text-[var(--destructive)]">
						{error}
					</p>
				)}
				<Button
					type="submit"
					className="h-11 w-full rounded-xl px-6 active:scale-[0.98]"
					disabled={loading}
				>
					{loading ? "Opening inbox..." : "Open inbox"}
				</Button>
			</form>
		</AuthShell>
	);
}
