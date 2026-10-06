"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, LoaderCircle, MailPlus, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getSetupStatus,
  checkExistingMx,
  prepareSetup,
  submitPrimaryDomain,
  submitRegistration,
} from "./utils";
import type { DomainPreflight, DomainSetupResult, SetupRequirementCheck } from "./types";

export function RegisterClient() {
  const router = useRouter();
  const [hasAdminAccount, setHasAdminAccount] = useState<boolean | null>(null);
  const [hasPrimaryDomain, setHasPrimaryDomain] = useState<boolean | null>(
    null,
  );
  const [primaryDomain, setPrimaryDomain] = useState<string | null>(null);
  const [primaryDomainSendingRequested, setPrimaryDomainSendingRequested] = useState<boolean | null>(null);
  const [setupDomain, setSetupDomain] = useState<string | null>(null);
  const [domainCheck, setDomainCheck] = useState<DomainPreflight | null>(null);
  const [domainChecking, setDomainChecking] = useState(false);
  const [enableSending, setEnableSending] = useState(false);
  const [setupEnableSending, setSetupEnableSending] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [checks, setChecks] = useState<SetupRequirementCheck[]>([]);
  const [databaseMigrated, setDatabaseMigrated] = useState(false);
  const [preparationComplete, setPreparationComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mxChecking, setMxChecking] = useState(true);
  const [mxRecordsExist, setMxRecordsExist] = useState<boolean | null>(null);
  const [replaceMxRecords, setReplaceMxRecords] = useState(false);
  const [mxCheckRevision, setMxCheckRevision] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void runPreparation();
  }, []);

  const accountDomain = setupDomain ?? primaryDomain;

  useEffect(() => {
    if (step !== 3 || !accountDomain) return;

    let active = true;
    setMxChecking(true);
    setMxRecordsExist(null);
    setReplaceMxRecords(false);
    setError(null);

    void checkExistingMx(accountDomain)
      .then(({ ok, data }) => {
        if (!active) return;
        setMxChecking(false);
        if (!ok || data.hasExistingMx === undefined) {
          setError(typeof data.error === "string" ? data.error : "Could not check existing MX records");
          return;
        }
        setMxRecordsExist(data.hasExistingMx);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMxChecking(false);
        setError(error instanceof Error ? error.message : "Could not check existing MX records");
      });

    return () => {
      active = false;
    };
  }, [step, accountDomain, mxCheckRevision]);

  async function runPreparation() {
    setLoading(true);
    setError(null);
    setPreparationComplete(false);

    try {
      const preparation = await prepareSetup();
      setChecks(preparation.data.checks ?? []);
      setDatabaseMigrated(!!preparation.data.migrated);
      if (!preparation.ok) {
        setError(preparation.data.error ?? "Complete the missing configuration before continuing.");
        return;
      }

      const data = await getSetupStatus();
      setHasAdminAccount(data.hasAdminAccount);
      setHasPrimaryDomain(data.hasPrimaryDomain);
      setPrimaryDomain(data.primaryDomain?.hostname ?? null);
      setPrimaryDomainSendingRequested(data.primaryDomain?.sendingRequested ?? null);
      setPreparationComplete(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Installation preparation failed");
    } finally {
      setLoading(false);
    }
  }

  async function onDomainSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const hostname = String(new FormData(e.currentTarget).get("domain") ?? "").toLowerCase().trim();
    const usedCachedCheck = domainCheck?.hostname === hostname;
    const result: { ok: boolean; data: DomainSetupResult } = usedCachedCheck
      ? { ok: true, data: { domain: domainCheck } }
      : await submitPrimaryDomain(hostname);
    const { ok, data } = result;
    setLoading(false);
    if (!ok || !data.domain) {
      setError(
        typeof data.error === "string" ? data.error : "Domain setup failed",
      );
      return;
    }
    setSetupDomain(data.domain.hostname);
    setSetupEnableSending(true);
    setStep(3);
  }

  async function onDomainBlur(e: React.FocusEvent<HTMLInputElement>) {
    const hostname = e.currentTarget.value.toLowerCase().trim();
    if (hostname.length < 3 || domainCheck?.hostname === hostname) return;

    setDomainChecking(true);
    setError(null);
    const { ok, data } = await submitPrimaryDomain(hostname);
    setDomainChecking(false);
    if (!ok || !data.domain) {
      setDomainCheck(null);
      setEnableSending(false);
      setError(typeof data.error === "string" ? data.error : "Domain check failed");
      return;
    }

    setDomainCheck(data.domain);
    setEnableSending(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const domain = setupDomain ?? primaryDomain;
    if (!domain) {
      setLoading(false);
      setError("Domain setup is not complete");
      return;
    }

    const { ok, data } = await submitRegistration(form, {
      firstRun: true,
      domain,
      enableSending: setupDomain
        ? setupEnableSending
        : primaryDomainSendingRequested ?? undefined,
      replaceMxRecords,
    });
    setLoading(false);
    if (!ok) {
      if (data.code === "MX_RECORDS_CONFLICT") {
        setMxRecordsExist(true);
        setReplaceMxRecords(false);
        setError(null);
        return;
      }
      setError(
        typeof data.error === "string" ? data.error : "Registration failed",
      );
      return;
    }
    window.location.assign(data.redirect ?? "/login");
  }

  const showDomainStep = hasPrimaryDomain === false && step === 2;

  if (hasAdminAccount === true) {
    return (
      <AuthShell
        icon={MailPlus}
        title="Account registration is closed"
        footer={
          <Link
            href="/login"
            className="inline-flex items-center gap-2 hover:underline"
          >
            Sign in instead
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            This installation already has an account for {primaryDomain ?? "this workspace"}.
          </p>
          <Button
            type="button"
            className="h-10 w-full rounded-xl active:scale-[0.98]"
            onClick={() => router.push("/login")}
          >
            Go to login
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon={MailPlus}
      title={step === 1 ? "Prepare installation" : showDomainStep ? "Add your domain" : "Create your mailbox"}
      // description={
      // 	showDomainStep
      // 		? "Connect the primary Cloudflare zone first so routing records can be created before the first mailbox."
      // 		: `Choose a mailbox username on ${accountDomain ?? "the primary domain"} and add a recovery email.`
      // }
      steps={
        [
          { label: "System", active: step === 1 },
          { label: "Domain", active: step === 2 },
          { label: "Account", active: step === 3 },
        ]
      }
    >
      {step === 1 ? (
        <div className="space-y-5">
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Dispatch checks SMTP, object storage, and the database, then initializes a clean schema before setup continues.
          </p>
          <div className="space-y-2">
            {loading && checks.length === 0 && (
              <div className="flex items-center gap-3 rounded-xl bg-[var(--muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Checking installation
              </div>
            )}
            {checks.map((check) => (
              <div key={check.key} className="flex items-start gap-3 rounded-xl bg-[var(--muted)] px-4 py-3">
                {check.configured ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--destructive)]" />
                )}
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{check.key}</p>
                  {!check.configured && <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{check.message}</p>}
                </div>
              </div>
            ))}
            {preparationComplete && (
              <div className="flex items-center gap-3 rounded-xl bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success)]">
                <CheckCircle2 className="h-4 w-4" />
                {databaseMigrated ? "Clean database migrated successfully" : "Database schema is ready"}
              </div>
            )}
          </div>
          {error && (
            <p className="rounded-xl border border-[var(--destructive)]/25 bg-[var(--destructive)]/10 px-4 py-3 text-sm font-medium text-[var(--destructive)]">
              {error}
            </p>
          )}
          {preparationComplete ? (
            <Button
              type="button"
              className="h-10 w-full rounded-xl active:scale-[0.98]"
              onClick={() => setStep(hasPrimaryDomain ? 3 : 2)}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-xl active:scale-[0.98]"
              disabled={loading}
              onClick={() => void runPreparation()}
            >
              {loading ? "Checking..." : "Check again"}
            </Button>
          )}
        </div>
      ) : showDomainStep ? (
        <form method="post" onSubmit={onDomainSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="domain">Primary domain</Label>
            <Input
              id="domain"
              name="domain"
              placeholder="example.com"
              autoComplete="url"
              required
              onBlur={(event) => void onDomainBlur(event)}
              onChange={(event) => {
                if (domainCheck?.hostname !== event.currentTarget.value.toLowerCase().trim()) {
                  setDomainCheck(null);
                  setEnableSending(false);
                }
              }}
            />
            <p className="text-xs leading-5 text-[var(--muted-foreground)]">
              Use example.com. After adding it, publish MX, SPF, and DKIM at your DNS host.
            </p>
          </div>
          {domainCheck && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)]">
              After adding, publish MX, SPF, and DKIM at your DNS host. Dispatch does not change DNS for you.
            </div>
          )}
          {error && (
            <p className="rounded-xl border border-[var(--destructive)]/25 bg-[var(--destructive)]/10 px-4 py-3 text-sm font-medium text-[var(--destructive)]">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="h-10 w-full rounded-xl active:scale-[0.98]"
            disabled={loading || domainChecking}
          >
            {loading ? "Adding domain..." : "Continue"}
          </Button>
        </form>
      ) : (
        <form method="post" onSubmit={onSubmit} className="space-y-5">
					{mxChecking && (
						<div className="flex items-center gap-3 rounded-xl bg-[var(--muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
							<LoaderCircle className="h-4 w-4 animate-spin" />
							Checking existing MX records
						</div>
					)}
					{mxRecordsExist === false && (
						<div className="flex items-center gap-3 rounded-xl bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success)]">
							<CheckCircle2 className="h-4 w-4" />
							No existing MX records found
						</div>
					)}
					{mxRecordsExist === true && (
						<div className="rounded-xl border border-[var(--destructive)]/25 bg-[var(--destructive)]/10 px-4 py-4 text-[var(--foreground)]">
							<span className="flex items-center gap-2 text-sm font-medium text-[var(--destructive)]">
								<AlertTriangle className="h-4 w-4" />
								Existing MX records found
							</span>
							<p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
								Mail currently goes to another provider. Dispatch cannot change DNS for you — update MX at your DNS host after setup, or incoming mail will keep going to the old provider.
							</p>
						</div>
					)}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 relative">
              <Input
                id="username"
                name="username"
                placeholder="you"
                autoComplete="username"
                required
								className="pr-34"
              />
              <span className="max-w-36 truncate text-sm font-medium text-[var(--muted-foreground)] absolute top-2.5 right-5">
                @{accountDomain ?? "domain"}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
            <p className="text-xs leading-5 text-[var(--muted-foreground)]">
              Sets your administrator account password and the first mailbox password to the same value at setup. After
              setup they are independent — webmail and IMAP/SMTP use the mailbox password; /admin/login uses the account
              password.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resetEmail">Recovery email</Label>
            <Input
              id="resetEmail"
              name="resetEmail"
              type="email"
              placeholder="you@gmail.com"
              required
            />
            {/* <p className="text-xs leading-5 text-[var(--muted-foreground)]">Used later for password reset.</p> */}
          </div>

          {error && (
            <p className="rounded-xl border border-[var(--destructive)]/25 bg-[var(--destructive)]/10 px-4 py-3 text-sm font-medium text-[var(--destructive)]">
              {error}
            </p>
          )}
					{!mxChecking && mxRecordsExist === null && (
						<Button
							type="button"
							variant="outline"
							className="h-10 w-full rounded-xl active:scale-[0.98]"
							onClick={() => setMxCheckRevision((value) => value + 1)}
						>
							Check MX records again
						</Button>
					)}
					<Button
						type="submit"
						className="mt-8 h-10 w-full rounded-xl active:scale-[0.98]"
						disabled={loading || mxChecking || mxRecordsExist === null || hasAdminAccount === null || hasPrimaryDomain === null}
					>
						{loading ? "Creating..." : "Create account"}
					</Button>
        </form>
      )}
    </AuthShell>
  );
}
