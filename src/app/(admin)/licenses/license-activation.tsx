"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { LicenseStatus } from "@/lib/licenses/types";
import type { ActivatableLicensePlan, LicenseAction } from "./types";
import { formatLicensePlan, loadLicenseStatus, runLicenseAction } from "./utils";

export function LicenseActivation() {
	const [license, setLicense] = useState<LicenseStatus | null>(null);
	const [licenseKey, setLicenseKey] = useState("");
	const [selectedPlan, setSelectedPlan] = useState<ActivatableLicensePlan>("pro");
	const [loading, setLoading] = useState(true);
	const [action, setAction] = useState<LicenseAction | null>(null);
	const [status, setStatus] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		loadLicenseStatus()
			.then((nextLicense) => {
				if (!cancelled) setLicense(nextLicense);
			})
			.catch((error) => {
				if (!cancelled) setStatus(error instanceof Error ? error.message : "Unable to load license status");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	async function submit(nextAction: LicenseAction) {
		if (nextAction !== "deactivate" && !licenseKey.trim()) {
			setStatus("Enter your license key");
			return;
		}
		if (nextAction === "deactivate" && !window.confirm("Deactivate this license on this installation?")) return;

		setAction(nextAction);
		setStatus(null);
		try {
			const nextLicense = await runLicenseAction(nextAction, licenseKey, nextAction === "activate" ? selectedPlan : undefined);
			setLicense(nextLicense);
			setLicenseKey("");
			setStatus(nextAction === "deactivate" ? "License deactivated" : nextAction === "validate" ? "License validated" : "License activated");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "License request failed");
			try {
				setLicense(await loadLicenseStatus());
			} catch {
				// Keep the last visible status when the local status endpoint is unavailable.
			}
		} finally {
			setAction(null);
		}
	}

	if (loading) return <Skeleton className="h-64 w-full rounded-3xl" />;

	const hasActivation = !!license?.activatedAt && license.state !== "deactivated";

	if (license?.active) {
		return (
			<Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-6">
				<CardContent className="flex items-start gap-4 py-8">
					<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]">
						<CheckCircle2 className="h-6 w-6" />
					</span>
					<div className="min-w-0 flex-1">
						<CardTitle>License activated</CardTitle>
						<p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
							Your {formatLicensePlan(license.plan)} license is active. Licensed features are ready to use.
						</p>
						<Button type="button" variant="outline" className="mt-5" onClick={() => void submit("deactivate")} disabled={action !== null}>
							{action === "deactivate" ? "Deactivating..." : "Deactivate license"}
						</Button>
						{status && <p className="mt-3 text-sm text-[var(--muted-foreground)]">{status}</p>}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-6">
			<CardContent className="space-y-5 pb-6">
				{hasActivation && license && (
					<p className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)]">
						This license is currently {license.state}. Enter its key to validate or deactivate it.
					</p>
				)}
				{!hasActivation && (
					<div className="space-y-4 pt-6">
						<Label className="mb-4">Already has a license? Choose your tier</Label>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-2" role="radiogroup" aria-label="Product">
							<button
								type="button"
								role="radio"
								aria-checked={selectedPlan === "pro"}
								onClick={() => setSelectedPlan("pro")}
								disabled={action !== null}
								className={`rounded-2xl border px-4 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
									selectedPlan === "pro"
										? "border-[var(--primary)] bg-[var(--muted)] ring-1 ring-[var(--primary)]"
										: "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]"
								}`}
							>
								<span className="block text-xl font-semibold">Pro</span>
								<span className="mt-1 block text-xs text-[var(--muted-foreground)]">For individual power users</span>
							</button>
							<button
								type="button"
								role="radio"
								aria-checked={selectedPlan === "team"}
								onClick={() => setSelectedPlan("team")}
								disabled={action !== null}
								className={`rounded-2xl border px-4 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
									selectedPlan === "team"
										? "border-[var(--primary)] bg-[var(--muted)] ring-1 ring-[var(--primary)]"
										: "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]"
								}`}
							>
								<span className="block text-xl font-semibold text-[var(--foreground)]">Team</span>
								<span className="mt-1 block text-xs text-[var(--muted-foreground)]">For teams and shared inboxes</span>
							</button>
						</div>
					</div>
				)}
				<div className="space-y-2">
					<Label htmlFor="licenseKey">License key</Label>
					<Input
						id="licenseKey"
						type="password"
						autoComplete="off"
						value={licenseKey}
						onChange={(event) => setLicenseKey(event.target.value)}
						placeholder="Enter your Dispatch license key"
						disabled={action !== null}
					/>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					{hasActivation ? (
						<>
							<Button type="button" onClick={() => void submit("validate")} disabled={action !== null}>
								{action === "validate" ? "Validating..." : "Validate license"}
							</Button>
							<Button type="button" variant="outline" onClick={() => void submit("deactivate")} disabled={action !== null}>
								{action === "deactivate" ? "Deactivating..." : "Deactivate"}
							</Button>
						</>
					) : (
						<Button type="button" onClick={() => void submit("activate")} disabled={action !== null}>
							{action === "activate" ? "Activating..." : "Activate"}
						</Button>
					)}
					{status && <p className="text-sm text-[var(--muted-foreground)]">{status}</p>}
				</div>
			</CardContent>
		</Card>
	);
}
