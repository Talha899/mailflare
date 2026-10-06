"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, LoaderCircle, MailPlus } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { checkDomain, createDomain, createMailbox, getDomains } from "./utils";
import type { DomainPreflight } from "./types";

export function OnboardingClient() {
	const router = useRouter();
	const [step, setStep] = useState<1 | 2>(1);
	const [hostname, setHostname] = useState("");
	const [domainCheck, setDomainCheck] = useState<DomainPreflight | null>(null);
	const [domainChecking, setDomainChecking] = useState(false);
	const [enableSending, setEnableSending] = useState(false);
	const [domainId, setDomainId] = useState("");
	const [localPart, setLocalPart] = useState("me");
	const [error, setError] = useState<string | null>(null);
	const [mxConflict, setMxConflict] = useState(false);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		void getDomains()
			.then((data) => {
				const primary = data.domains?.[0];
				if (!primary) return;
				setDomainId(primary.id);
				setHostname(primary.hostname);
				setStep(2);
			})
			.catch(() => undefined);
	}, []);

	async function addDomain(replaceMxRecords = false) {
		setLoading(true);
		setError(null);

		const normalized = hostname.toLowerCase().trim();
		let checkedDomain = domainCheck;
		let sendingRequested = enableSending;
		if (checkedDomain?.hostname !== normalized) {
			const result = await checkDomain(normalized);
			if (!result.ok || !result.domain) {
				setLoading(false);
				setError(result.error ?? "Domain check failed");
				return;
			}
			checkedDomain = result.domain;
			const isManual = result.domain.mode === "manual" || result.domain.zone.id === "manual";
			sendingRequested = isManual ? true : false;
			setDomainCheck(result.domain);
			setEnableSending(sendingRequested);
		}
		if (!checkedDomain) {
			setLoading(false);
			setError("Domain check failed");
			return;
		}

		const { ok, data } = await createDomain(checkedDomain.hostname, sendingRequested, replaceMxRecords);
		setLoading(false);
		if (!ok || !data.domain) {
			if (data.code === "MX_RECORDS_CONFLICT") {
				setMxConflict(true);
				setError(null);
				return;
			}
			setError(data.error ?? "Failed to add domain");
			return;
		}
		setMxConflict(false);
		setDomainId(data.domain.id);
		setStep(2);
	}

	async function inspectDomain() {
		const normalized = hostname.toLowerCase().trim();
		if (normalized.length < 3 || domainCheck?.hostname === normalized) return;

		setDomainChecking(true);
		setError(null);
		setMxConflict(false);
		const result = await checkDomain(normalized);
		setDomainChecking(false);
		if (!result.ok || !result.domain) {
			setDomainCheck(null);
			setEnableSending(false);
			setError(result.error ?? "Domain check failed");
			return;
		}

		setDomainCheck(result.domain);
		const isManual = result.domain.mode === "manual" || result.domain.zone.id === "manual";
		setEnableSending(isManual);
	}

	async function addMailbox() {
		setLoading(true);
		setError(null);

		const { ok, data } = await createMailbox(domainId, localPart);
		setLoading(false);
		if (!ok) {
			setError(data.error ?? "Failed to create mailbox");
			return;
		}
		router.push("/inbox");
	}

	return (
		<AuthShell
			icon={MailPlus}
			title={step === 1 ? "Connect mail routing" : "Create your first mailbox"}
			description={
				step === 1
					? "Add the Cloudflare domain that will receive mail and optionally send through this workspace."
					: "Choose the mailbox address that should open directly into the inbox."
			}
			steps={[
				{ label: "Domain", active: step === 1 },
				{ label: "Mailbox", active: step === 2 },
			]}
			footer={
				<span className="inline-flex items-center gap-2 text-[var(--muted-foreground)]">
					Setup completes in the inbox
					<ArrowRight className="h-4 w-4" />
				</span>
			}
		>
			<div className="space-y-5">
				{step === 1 && (
					<>
						<p className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
							Zones on your Cloudflare account are configured automatically. Other domains use TXT
							ownership verification and a manual MX/SPF/DMARC checklist.
						</p>
						<div className="space-y-2">
							<Label htmlFor="domain">Domain</Label>
							<Input
								id="domain"
								value={hostname}
								onChange={(e) => {
									setHostname(e.target.value);
									if (domainCheck?.hostname !== e.target.value.toLowerCase().trim()) {
										setDomainCheck(null);
										setEnableSending(false);
										setMxConflict(false);
									}
								}}
								onBlur={() => void inspectDomain()}
								placeholder="example.com"
							/>
						</div>
						{!(domainCheck?.mode === "manual" || domainCheck?.zone.id === "manual") && (
							<div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--muted)] px-4 py-3">
								<div>
									<Label htmlFor="onboarding-enable-sending">Enable sending</Label>
									<p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
										{domainChecking
											? "Checking Cloudflare access..."
											: domainCheck
												? enableSending
													? "Required to send email."
													: "Receive-only mode."
												: "Leave the domain field to verify it."}
									</p>
								</div>
								{domainChecking ? (
									<LoaderCircle className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
								) : (
									<Switch
										id="onboarding-enable-sending"
										checked={enableSending}
										onCheckedChange={setEnableSending}
										disabled={!domainCheck}
									/>
								)}
							</div>
						)}
						{domainCheck && domainCheck.mode !== "manual" && domainCheck.zone.id !== "manual" && (
							<div className="flex items-center gap-3 rounded-xl bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success)]">
								<CheckCircle2 className="h-4 w-4" />
								Domain found in Cloudflare as {domainCheck.zone.name}
							</div>
						)}
						{domainCheck && (domainCheck.mode === "manual" || domainCheck.zone.id === "manual") && (
							<div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)]">
								Not on this Cloudflare account. Continue to get TXT verification and DNS records to
								publish at your registrar.
							</div>
						)}
						{mxConflict && (
							<div className="space-y-3 rounded-xl border border-[var(--destructive)]/25 bg-[var(--destructive)]/10 px-4 py-4 text-[var(--foreground)]">
								<div className="flex items-start gap-3">
									<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--destructive)]" />
									<p className="text-sm leading-6 text-[var(--muted-foreground)]">
										Existing MX records deliver mail to another provider. Continuing deletes those records and replaces them with Cloudflare Email Routing, so the previous provider will stop receiving mail.
									</p>
								</div>
								<Button
									onClick={() => void addDomain(true)}
									disabled={loading}
									className="h-10 w-full rounded-xl active:scale-[0.98]"
								>
									{loading ? "Replacing MX records..." : "Delete MX records and continue"}
								</Button>
							</div>
						)}
						{!mxConflict && (
							<Button
								onClick={() => void addDomain()}
								disabled={!hostname || loading || domainChecking}
								className="h-10 w-full rounded-xl active:scale-[0.98]"
							>
								{loading ? "Adding..." : "Add domain"}
							</Button>
						)}
					</>
				)}
				{step === 2 && (
					<>
						<div className="space-y-2">
							<Label htmlFor="localPart">Mailbox address</Label>
							<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
								<Input
									id="localPart"
									value={localPart}
									onChange={(e) => setLocalPart(e.target.value)}
									className="min-w-0"
								/>
								<span className="max-w-36 truncate text-sm font-medium text-[var(--muted-foreground)]">@{hostname}</span>
							</div>
						</div>
						<Button
							onClick={addMailbox}
							disabled={!localPart || loading}
							className="h-10 w-full rounded-xl active:scale-[0.98]"
						>
							{loading ? "Creating..." : "Go to inbox"}
						</Button>
					</>
				)}
				{error && (
					<p className="rounded-xl border border-[var(--destructive)]/25 bg-[var(--destructive)]/10 px-4 py-3 text-sm font-medium text-[var(--destructive)]">
						{error}
					</p>
				)}
			</div>
		</AuthShell>
	);
}
