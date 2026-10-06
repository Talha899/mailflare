"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ServerCog, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	formatLoginError,
	formatLoginNetworkError,
	submitLogin,
	submitMfaCode,
} from "@/app/(auth)/login/utils";

export function AdminLoginClient({ showSignupLink = false }: { showSignupLink?: boolean }) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [challengeToken, setChallengeToken] = useState<string | null>(null);
	const [code, setCode] = useState("");

	function finish(redirect?: string) {
		router.replace(redirect ?? "/admin");
		router.refresh();
	}

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const { ok, data } = await submitLogin(new FormData(e.currentTarget), { adminPortal: true });
			if (!ok) {
				setError(formatLoginError(data.error, "admin"));
				return;
			}
			if (data.mfaRequired && data.challengeToken) {
				setChallengeToken(data.challengeToken);
				return;
			}
			finish(data.redirect);
		} catch (err) {
			setError(formatLoginNetworkError(err, "admin"));
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
			const { ok, data } = await submitMfaCode(challengeToken, code, { adminPortal: true });
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
			setError("Unable to reach the admin console. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	if (challengeToken) {
		return (
			<AuthShell
				variant="admin"
				icon={ShieldCheck}
				title="Second factor required"
				description="Enter a TOTP or recovery code to finish operator authentication."
				steps={[
					{ label: "Credentials", active: false },
					{ label: "MFA", active: true },
				]}
			>
				<form onSubmit={onSubmitCode} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="code">One-time code</Label>
						<Input
							id="code"
							name="code"
							value={code}
							onChange={(event) => setCode(event.target.value)}
							inputMode="numeric"
							autoComplete="one-time-code"
							autoFocus
							placeholder="123456"
							className="font-mono"
							required
						/>
					</div>
					{error && (
						<p className="rounded-xl border border-[var(--destructive)]/25 bg-[var(--destructive)]/10 px-3 py-2.5 text-sm text-[var(--destructive)]">
							{error}
						</p>
					)}
					<Button type="submit" className="h-10 w-full rounded-xl active:scale-[0.98]" disabled={loading}>
						{loading ? "Verifying..." : "Confirm access"}
					</Button>
					<button
						type="button"
						className="w-full text-center text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
						onClick={() => {
							setChallengeToken(null);
							setCode("");
							setError(null);
						}}
					>
						Back to credentials
					</button>
				</form>
			</AuthShell>
		);
	}

	return (
		<AuthShell
			variant="admin"
			icon={ServerCog}
			title="Operator sign-in"
			description="Use your administrator account password — not your mailbox IMAP/webmail password — to manage domains, mailboxes, DNS, and routing."
			footer={
				showSignupLink ? (
					<p className="text-center text-xs text-[var(--muted-foreground)]">
						New organization?{" "}
						<Link href="/signup" className="font-medium text-[var(--foreground)] underline-offset-2 hover:underline">
							Create a workspace
						</Link>
					</p>
				) : undefined
			}
		>
			<form method="post" onSubmit={onSubmit} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="email">Admin email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autoComplete="username"
						placeholder="admin@your-domain.com"
						className="rounded-xl"
						required
					/>
				</div>
				<div className="space-y-2">
					<div className="flex items-center justify-between gap-3">
						<Label htmlFor="password">Admin password</Label>
						<Link
							href="/forgot-password"
							className="text-[11px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline"
						>
							Reset password
						</Link>
					</div>
					<Input
						id="password"
						name="password"
						type="password"
						autoComplete="current-password"
						className="rounded-xl"
						required
					/>
					<p className="text-[11px] text-[var(--muted-foreground)]">
						Separate from mailbox passwords used for webmail and IMAP/SMTP.
					</p>
				</div>
				{error && (
					<p className="rounded-xl border border-[var(--destructive)]/25 bg-[var(--destructive)]/10 px-3 py-2.5 text-sm text-[var(--destructive)]">
						{error}
					</p>
				)}
				<Button type="submit" className="h-10 w-full rounded-xl active:scale-[0.98]" disabled={loading}>
					{loading ? "Authenticating..." : "Enter admin console"}
				</Button>
			</form>
		</AuthShell>
	);
}
