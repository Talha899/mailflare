"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileField } from "@/components/auth/turnstile";
import { submitLogin, submitMfaCode } from "./utils";

export function LoginClient({
	showSignupLink = false,
	adminPortal = false,
}: {
	showSignupLink?: boolean;
	adminPortal?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileReset, setTurnstileReset] = useState(0);
  // Set once the password is accepted for an account with a second factor.
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState("");

  function finish(redirect?: string) {
    const fallback = adminPortal ? "/admin" : "/inbox";
    router.replace(redirect ?? fallback);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { ok, data } = await submitLogin(new FormData(e.currentTarget), { adminPortal });
      if (!ok) {
        setError(data.error ?? "Login failed");
        setTurnstileReset((value) => value + 1);
        return;
      }
      if (data.mfaRequired && data.challengeToken) {
        setChallengeToken(data.challengeToken);
        return;
      }
      finish(data.redirect);
    } catch (error) {
      setError(
        error instanceof DOMException && error.name === "TimeoutError"
          ? "Login timed out. Please try again."
          : "Unable to reach the login service. Please try again.",
      );
      setTurnstileReset((value) => value + 1);
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
        // An expired challenge sends the user back to the password step.
        if (data.error?.includes("expired")) {
          setChallengeToken(null);
          setCode("");
        }
        return;
      }
      finish(data.redirect);
    } catch {
      setError("Unable to reach the login service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (challengeToken) {
    return (
      <AuthShell
        icon={ShieldCheck}
        title="Two-factor authentication"
        description="Enter the 6-digit code from your authenticator app, or one of your recovery codes."
      >
        <form onSubmit={onSubmitCode} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
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
            <p className="rounded-2xl border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 px-4 py-3 text-sm font-medium text-[var(--destructive)]">
              {error}
            </p>
          )}
          <Button type="submit" className="h-11 w-full rounded-full px-6 active:scale-[0.98]" disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            onClick={() => {
              setChallengeToken(null);
              setCode("");
              setError(null);
            }}
          >
            Back to sign in
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon={Mail}
      title={adminPortal ? "Admin sign in" : "Sign in to your mailbox"}
      description={
        adminPortal
          ? "Manage domains, mailboxes, and mail infrastructure."
          : "Enter the email address and password created for your mailbox. There is no self-service signup."
      }
    >
      <form method="post" onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-[var(--primary)] hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {error && (
          <p className="rounded-2xl border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 px-4 py-3 text-sm font-medium text-[var(--destructive)]">
            {error}
          </p>
        )}
        <TurnstileField resetSignal={turnstileReset} />
        <Button
          type="submit"
          className="h-11 w-full rounded-full px-6 active:scale-[0.98]"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        {adminPortal && showSignupLink && (
          <p className="text-center text-sm text-[var(--muted-foreground)]">
            New organization?{" "}
            <Link href="/signup" className="font-medium text-[var(--primary)] hover:underline">
              Create a workspace
            </Link>
          </p>
        )}
        {adminPortal && (
          <p className="text-center text-sm text-[var(--muted-foreground)]">
            Mailbox users:{" "}
            <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
              Webmail sign in
            </Link>
          </p>
        )}
        {!adminPortal && (
          <p className="text-center text-sm text-[var(--muted-foreground)]">
            Administrator?{" "}
            <Link href="/admin/login" className="font-medium text-[var(--primary)] hover:underline">
              Admin portal
            </Link>
          </p>
        )}
      </form>
    </AuthShell>
  );
}
