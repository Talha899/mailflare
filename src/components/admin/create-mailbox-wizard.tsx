"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { authFetch } from "@/lib/auth/client";
import type { MailboxConnectionInfo } from "@/lib/mailboxes/connection-info";

type Domain = { id: string; hostname: string; status?: string };

function generatePassword(length = 20): string {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function CopyRow({ label, value }: { label: string; value: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
			<div className="min-w-0 flex-1">
				<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
					{label}
				</p>
				<p className="break-all font-mono text-[13px] tracking-tight text-[var(--foreground)]">
					{value}
				</p>
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="shrink-0"
				onClick={() => {
					void navigator.clipboard.writeText(value).then(() => {
						setCopied(true);
						window.setTimeout(() => setCopied(false), 1500);
					});
				}}
			>
				{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
			</Button>
		</div>
	);
}

function StepDots({ step, total }: { step: number; total: number }) {
	return (
		<div className="flex items-center gap-2">
			{Array.from({ length: total }, (_, i) => {
				const n = i + 1;
				const active = n === step;
				const done = n < step;
				return (
					<span
						key={n}
						className={`h-1.5 flex-1 rounded-sm transition-colors ${
							active
								? "bg-[var(--primary)]"
								: done
									? "bg-[color-mix(in_oklab,var(--primary)_45%,var(--muted))]"
									: "bg-[var(--muted)]"
						}`}
						aria-hidden="true"
					/>
				);
			})}
			<span className="ml-1 shrink-0 text-[11px] font-medium tabular-nums text-[var(--muted-foreground)]">
				{step}/{total}
			</span>
		</div>
	);
}

export function CreateMailboxWizard({
	domains,
	onCreated,
	onCancel,
}: {
	domains: Domain[];
	onCreated: () => void;
	onCancel: () => void;
}) {
	const active = domains.filter((d) => !d.status || d.status === "active");
	const [step, setStep] = useState(1);
	const [domainId, setDomainId] = useState(active[0]?.id ?? "");
	const [localPart, setLocalPart] = useState("");
	const [password, setPassword] = useState(() => generatePassword());
	const [showPassword, setShowPassword] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [credentials, setCredentials] = useState<{
		address: string;
		password: string;
		connection: MailboxConnectionInfo;
	} | null>(null);

	const hostname = useMemo(
		() => active.find((d) => d.id === domainId)?.hostname ?? "",
		[active, domainId],
	);
	const preview = localPart.trim() && hostname ? `${localPart.trim().toLowerCase()}@${hostname}` : "";

	async function create() {
		setBusy(true);
		setError(null);
		try {
			const res = await authFetch("/api/accounts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: localPart.trim().toLowerCase(),
					domainId,
					password,
					role: "user",
					useAllDomains: true,
					aliases: [],
				}),
			});
			const json = (await res.json()) as {
				error?: string;
				credentials?: { address: string; password: string; connection: MailboxConnectionInfo };
			};
			if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed to create mailbox");
			if (!json.credentials) throw new Error("Mailbox created but credentials were not returned");
			setCredentials(json.credentials);
			setStep(4);
			onCreated();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create mailbox");
		} finally {
			setBusy(false);
		}
	}

	if (credentials) {
		return (
			<div className="space-y-4">
				<div className="rounded-lg border border-[color-mix(in_oklab,var(--success)_35%,var(--border))] bg-[color-mix(in_oklab,var(--success)_10%,var(--card))] px-3.5 py-3 text-[13px] leading-relaxed text-[var(--foreground)]">
					Mailbox created. Copy these credentials now — the mailbox password is shown only once. It is only for
					webmail, IMAP, and SMTP AUTH, not for signing in to the admin console.
				</div>
				<CopyRow label="Mailbox" value={credentials.address} />
				<CopyRow label="Password" value={credentials.password} />
				<div className="space-y-2">
					<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
						SMTP
					</p>
					{credentials.connection.smtp.configured ? (
						<>
							<CopyRow label="Host" value={credentials.connection.smtp.host} />
							<CopyRow label="Port" value={String(credentials.connection.smtp.port)} />
							<CopyRow label="Encryption" value={credentials.connection.smtp.encryption} />
							<CopyRow label="Username" value={credentials.connection.username} />
							<CopyRow label="Password" value={credentials.password} />
						</>
					) : (
						<p className="text-[13px] text-[var(--muted-foreground)]">
							SMTP submission is not configured (set MAIL_HOSTNAME and SMTP_SUBMISSION_PORT).
						</p>
					)}
				</div>
				<div className="space-y-2">
					<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
						IMAP
					</p>
					{credentials.connection.imap.configured ? (
						<>
							<CopyRow label="Host" value={credentials.connection.imap.host} />
							<CopyRow label="Port" value={String(credentials.connection.imap.port)} />
							<CopyRow label="Encryption" value={credentials.connection.imap.encryption} />
							<CopyRow label="Username" value={credentials.connection.username} />
							<CopyRow label="Password" value={credentials.password} />
						</>
					) : (
						<p className="text-[13px] text-[var(--muted-foreground)]">
							IMAP is not configured (set MAIL_HOSTNAME and IMAP_PORT).
						</p>
					)}
				</div>
				{credentials.connection.note && (
					<p className="text-xs text-[var(--muted-foreground)]">{credentials.connection.note}</p>
				)}
				<p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
					Webmail: sign in at /login with this mailbox address and mailbox password. IMAP and SMTP AUTH use the same
					mailbox password. The admin console at /admin/login uses a separate administrator account password.
				</p>
				<Button type="button" className="w-full" onClick={onCancel}>
					Done
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<StepDots step={step} total={3} />
			{step === 1 && (
				<div className="space-y-3">
					<div className="space-y-2">
						<Label>Domain</Label>
						<Select value={domainId} onChange={(e) => setDomainId(e.target.value)} required>
							<option value="">Select domain</option>
							{active.map((d) => (
								<option key={d.id} value={d.id}>
									{d.hostname}
								</option>
							))}
						</Select>
					</div>
					{!active.length && (
						<p className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2 text-[13px] text-[var(--muted-foreground)]">
							Add and activate a domain before creating mailboxes.
						</p>
					)}
					<div className="flex justify-end gap-2 pt-1">
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
						<Button type="button" disabled={!domainId} onClick={() => setStep(2)}>
							Continue
						</Button>
					</div>
				</div>
			)}
			{step === 2 && (
				<div className="space-y-3">
					<div className="space-y-2">
						<Label htmlFor="local-part">Mailbox name</Label>
						<div className="flex items-center gap-2">
							<Input
								id="local-part"
								value={localPart}
								onChange={(e) => setLocalPart(e.target.value.replace(/[^a-zA-Z0-9._%+-]/g, ""))}
								placeholder="support"
								autoFocus
							/>
							<span className="shrink-0 text-sm text-[var(--muted-foreground)]">@{hostname}</span>
						</div>
						{preview && (
							<p className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/60 px-3 py-2 font-mono text-[13px] tracking-tight text-[var(--foreground)]">
								{preview}
							</p>
						)}
					</div>
					<div className="flex justify-end gap-2 pt-1">
						<Button type="button" variant="outline" onClick={() => setStep(1)}>
							Back
						</Button>
						<Button type="button" disabled={!localPart.trim()} onClick={() => setStep(3)}>
							Continue
						</Button>
					</div>
				</div>
			)}
			{step === 3 && (
				<div className="space-y-3">
					<div className="space-y-2">
						<Label>Password</Label>
						<div className="flex gap-2">
							<Input
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="font-mono"
							/>
							<Button type="button" variant="outline" size="sm" onClick={() => setShowPassword((v) => !v)}>
								{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</Button>
							<Button type="button" variant="outline" size="sm" onClick={() => setPassword(generatePassword())}>
								<RefreshCw className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => void navigator.clipboard.writeText(password)}
							>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
						<p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
							Mailbox password for webmail, IMAP, and SMTP AUTH only — not your admin account password. Changing one
							does not change the other. Shown once after create.
						</p>
					</div>
					{error && (
						<p className="rounded-lg border border-[color-mix(in_oklab,var(--destructive)_35%,var(--border))] bg-[color-mix(in_oklab,var(--destructive)_8%,var(--card))] px-3 py-2 text-[13px] text-[var(--destructive)]">
							{error}
						</p>
					)}
					<div className="flex justify-end gap-2 pt-1">
						<Button type="button" variant="outline" onClick={() => setStep(2)}>
							Back
						</Button>
						<Button type="button" disabled={busy || password.length < 8} onClick={() => void create()}>
							{busy ? "Creating..." : "Create mailbox"}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
