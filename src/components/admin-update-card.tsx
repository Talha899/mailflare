"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleX, Database, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	applyDatabaseMigrations,
	getApplicationUpdateStatus,
	getMigrationStatus,
	triggerApplicationUpdate,
} from "./admin-update-card-utils";
import type { MigrationStatusResponse, UpdateStatusResponse, UpdateWorkflowResponse } from "./admin-update-card-types";

export function AdminUpdateCard() {
	const [status, setStatus] = useState<UpdateStatusResponse>();
	const [result, setResult] = useState<UpdateWorkflowResponse>();
	const [error, setError] = useState("");
	const [migrationError, setMigrationError] = useState("");
	const [migrationStatus, setMigrationStatus] = useState<MigrationStatusResponse>();
	const [isChecking, setIsChecking] = useState(true);
	const [isCheckingMigrations, setIsCheckingMigrations] = useState(true);
	const [isPending, setIsPending] = useState(false);
	const [isMigrating, setIsMigrating] = useState(false);

	useEffect(() => {
		let isActive = true;

		getApplicationUpdateStatus()
			.then((updateStatus) => {
				if (isActive) setStatus(updateStatus);
			})
			.catch((statusError) => {
				if (isActive) {
					setError(statusError instanceof Error ? statusError.message : "Could not check for updates");
				}
			})
			.finally(() => {
				if (isActive) setIsChecking(false);
			});

		getMigrationStatus()
			.then((databaseStatus) => {
				if (isActive) setMigrationStatus(databaseStatus);
			})
			.catch((statusError) => {
				if (isActive) {
					setMigrationError(statusError instanceof Error ? statusError.message : "Could not check database migrations");
				}
			})
			.finally(() => {
				if (isActive) setIsCheckingMigrations(false);
			});

		return () => {
			isActive = false;
		};
	}, []);

	async function handleUpdate() {
		setError("");
		setResult(undefined);
		setIsPending(true);

		try {
			setResult(await triggerApplicationUpdate());
		} catch (updateError) {
			setError(updateError instanceof Error ? updateError.message : "Could not start the update");
		} finally {
			setIsPending(false);
		}
	}

	async function handleMigrate() {
		setMigrationError("");
		setIsMigrating(true);
		try {
			setMigrationStatus(await applyDatabaseMigrations());
		} catch (migrationFailure) {
			setMigrationError(
				migrationFailure instanceof Error ? migrationFailure.message : "Could not apply database migrations",
			);
		} finally {
			setIsMigrating(false);
		}
	}

	const isNode = status?.runtime === "node";
	const showGithubConfig = !isChecking && !isNode && status?.configured === false;
	const showReleaseRow = !isChecking && (isNode || status?.configured);

	return (
		<Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6">
			<CardHeader className="flex flex-col gap-4 space-y-0 py-0 sm:flex-row sm:items-center">
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--compose)]">
					<RefreshCw className="h-5 w-5" />
				</div>
				<div>
					<CardTitle className="text-base">Application update</CardTitle>
					<p className="mt-1 text-sm text-[var(--muted-foreground)]">
						{isNode
							? "This install updates when you redeploy the container. Database migrations can be applied here if needed."
							: "Sync the latest Dispatch release and keep its database schema up to date."}
					</p>
				</div>
			</CardHeader>
			<CardContent className="space-y-5 pt-5">
				{isChecking && <Skeleton className="h-20 w-full rounded-2xl" />}

				{showGithubConfig && (
					<div className="space-y-3">
						<p className="text-sm text-[var(--muted-foreground)]">Complete the required Cloudflare Worker configuration:</p>
						<ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)]">
							{status.configuration?.map((item) => (
								<li key={item.name} className="flex items-center gap-3 px-4 py-3 text-sm">
									{item.configured ? (
										<CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
									) : (
										<CircleX className="h-4 w-4 shrink-0 text-[var(--destructive)]" />
									)}
									<code className="text-xs font-medium text-[var(--foreground)]">{item.name}</code>
									<span className={`ml-auto text-xs font-medium ${item.configured ? "text-[var(--success)]" : "text-[var(--destructive)]"}`}>
										{item.configured ? "Configured" : "Missing"}
									</span>
								</li>
							))}
						</ul>
					</div>
				)}

				{showReleaseRow && (
					<div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)]">
						<div className="flex items-center gap-3 px-4 py-4">
							<CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
							<p className="min-w-0 text-sm text-[var(--foreground)]">
								{isNode
									? `Dispatch v${status?.currentVersion ?? ""} is running. Redeploy the Coolify service to install a newer image.`
									: status?.available
										? `Dispatch v${status.targetVersion} is available. You are using v${status.currentVersion}.`
										: `Dispatch v${status?.currentVersion} is up to date.`}
							</p>
							{!isNode && status?.available && (
								<button
									type="button"
									onClick={handleUpdate}
									disabled={isPending}
									className="ml-auto shrink-0 text-sm font-medium text-[var(--compose)] hover:underline disabled:pointer-events-none disabled:opacity-50"
								>
									{isPending ? "Starting update..." : "Update Dispatch"}
								</button>
							)}
						</div>

						{isCheckingMigrations && (
							<div className="flex items-center gap-3 px-4 py-4">
								<Skeleton className="h-4 w-4 rounded-full" />
								<Skeleton className="h-4 w-44" />
							</div>
						)}

						{!isCheckingMigrations && !!migrationStatus?.pending.length && !migrationStatus.unknown.length && (
							<div className="flex items-center gap-3 px-4 py-4">
								<Database className={`h-4 w-4 shrink-0 text-[var(--compose)] ${isMigrating ? "animate-pulse" : ""}`} />
								<p className="text-sm text-[var(--foreground)]">
									{migrationStatus.pending.length} database {migrationStatus.pending.length === 1 ? "migration is" : "migrations are"} pending.
								</p>
								<button
									type="button"
									onClick={handleMigrate}
									disabled={isMigrating}
									className="ml-auto shrink-0 text-sm font-medium text-[var(--compose)] hover:underline disabled:pointer-events-none disabled:opacity-50"
								>
									{isMigrating ? "Updating database..." : "Update database"}
								</button>
							</div>
						)}

						{!isCheckingMigrations && !!migrationStatus?.unknown.length && (
							<div className="flex items-center gap-3 px-4 py-4 text-sm text-[var(--destructive)]">
								<CircleX className="h-4 w-4 shrink-0" />
								Deploy the matching Dispatch release before changing this database.
							</div>
						)}
					</div>
				)}

				{result?.ok && (
					<p className="text-sm text-[var(--success)]">
						Update started for {result.repository}@{result.ref}. Refresh this page after the deploy finishes.{" "}
						{result.runUrl && (
							<a className="font-medium underline" href={result.runUrl} target="_blank" rel="noreferrer">
								View workflow
							</a>
						)}
					</p>
				)}
				{error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
				{migrationError && <p className="text-sm text-[var(--destructive)]">{migrationError}</p>}
			</CardContent>
		</Card>
	);
}
