import { authFetch } from "@/lib/auth/client";
import { formatUserDate } from "@/lib/time/utils";
import type { BackupItem, BackupsResponse, BackupSettings } from "./types";

export const WEEKDAYS = [
	{ value: 0, label: "Sunday" },
	{ value: 1, label: "Monday" },
	{ value: 2, label: "Tuesday" },
	{ value: 3, label: "Wednesday" },
	{ value: 4, label: "Thursday" },
	{ value: 5, label: "Friday" },
	{ value: 6, label: "Saturday" },
];

export async function fetchBackups(): Promise<BackupsResponse> {
	const response = await authFetch("/api/backups");
	const data = (await response.json()) as BackupsResponse & { error?: string };
	if (!response.ok) throw new Error(data.error ?? "Failed to load backups");
	return data;
}

export async function saveBackupSettings(settings: BackupSettings): Promise<void> {
	const response = await authFetch("/api/backups", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(settings),
	});
	const data = (await response.json()) as { error?: string };
	if (!response.ok) throw new Error(data.error ?? "Failed to save backup settings");
}

export async function startBackup(): Promise<void> {
	const response = await authFetch("/api/backups", { method: "POST" });
	const data = (await response.json()) as { error?: string };
	if (!response.ok) throw new Error(data.error ?? "Failed to run backup");
}

export async function removeBackup(id: string): Promise<void> {
	const response = await authFetch(`/api/backups/${id}`, { method: "DELETE" });
	const data = (await response.json()) as { error?: string };
	if (!response.ok) throw new Error(data.error ?? "Failed to delete backup");
}

export async function restoreBackup(file: File): Promise<void> {
	const form = new FormData();
	form.set("backup", file);
	const response = await authFetch("/api/backups/restore", { method: "POST", body: form });
	const data = (await response.json()) as { error?: string };
	if (!response.ok) throw new Error(data.error ?? "Failed to restore backup");
}

export async function downloadBackup(backup: BackupItem): Promise<void> {
	const response = await authFetch(`/api/backups/${backup.id}/download`);
	if (!response.ok) {
		const data = (await response.json()) as { error?: string };
		throw new Error(data.error ?? "Failed to download backup");
	}
	const blob = await response.blob();
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = backup.filename ?? `${backup.id}.sql`;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

export function formatBackupDate(value: string | null): string {
	if (!value) return "-";
	return formatUserDate(value, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

export function formatBackupSize(value: number | null): string {
	if (value === null) return "-";
	if (value < 1024) return `${value} B`;
	if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
	return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function getStatusClass(status: BackupItem["status"]): string {
	if (status === "completed") {
		return "border-[color-mix(in_oklab,var(--success)_35%,var(--border))] bg-[color-mix(in_oklab,var(--success)_12%,var(--card))] text-[var(--success)]";
	}
	if (status === "failed") {
		return "border-[color-mix(in_oklab,var(--destructive)_35%,var(--border))] bg-[color-mix(in_oklab,var(--destructive)_10%,var(--card))] text-[var(--destructive)]";
	}
	if (status === "running") return "border-[var(--border)] bg-[var(--accent)] text-[var(--compose)]";
	return "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)]";
}
