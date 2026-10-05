"use client";

import { useState } from "react";
import { AlertTriangle, Check, CheckCheck, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	bounceSpfRecords,
	copyText,
	recordsForAuthCheck,
	toDnsHostInstruction,
	type DnsHostInstruction,
} from "./domain-dns-details-utils";
import { dnsAuthDescriptions, dnsAuthRecords, getDnsAuthItemClass } from "./utils";
import type { DnsAuthRecord, DnsRecord, DomainDnsDetailsProps } from "./types";

function CopyField({ label, value, copyable, hint }: { label: string; value: string; copyable: boolean; hint?: string }) {
	const [copied, setCopied] = useState(false);

	async function onCopy() {
		if (!copyable) return;
		const ok = await copyText(value);
		if (!ok) return;
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1500);
	}

	return (
		<div className="grid gap-1 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-start">
			<span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{label}</span>
			<div className="min-w-0">
				<p className="break-all font-mono text-sm text-neutral-900">{value}</p>
				{hint && <p className="mt-0.5 text-[11px] text-neutral-500">{hint}</p>}
			</div>
			{copyable ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-8 shrink-0 gap-1.5 bg-white px-2.5 text-xs"
					onClick={() => void onCopy()}
				>
					{copied ? (
						<>
							<CheckCheck className="h-3.5 w-3.5 text-green-600" />
							Copied
						</>
					) : (
						<>
							<Copy className="h-3.5 w-3.5" />
							Copy
						</>
					)}
				</Button>
			) : (
				<span className="text-[11px] text-amber-700">Not paste-ready yet</span>
			)}
		</div>
	);
}

function DnsInstructionCard({ instruction }: { instruction: DnsHostInstruction }) {
	return (
		<div className="rounded-lg border border-neutral-200 bg-white px-3 py-3 text-neutral-800">
			<p className="mb-2 text-xs font-semibold text-neutral-900">{instruction.title}</p>
			<div className="space-y-2.5">
				{instruction.fields.map((field) => (
					<CopyField
						key={`${field.label}:${field.value}`}
						label={field.label}
						value={field.value}
						copyable={field.copyable}
						hint={field.hint}
					/>
				))}
			</div>
			{instruction.note && <p className="mt-2 text-[11px] text-neutral-500">{instruction.note}</p>}
		</div>
	);
}

function ManualDnsPanel({
	title,
	body,
	rows,
	hostname,
}: {
	title: string;
	body: string;
	rows: DnsRecord[];
	hostname: string;
}) {
	return (
		<div className="col-span-full space-y-2 rounded-xl border border-blue-100 bg-blue-50/80 px-3 py-3 text-xs text-neutral-800">
			<p className="font-medium text-neutral-900">{title}</p>
			<p className="text-neutral-600">{body}</p>
			{rows.length === 0 ? (
				<p className="text-amber-800">No suggested record yet. Refresh details after ownership is verified.</p>
			) : (
				<ul className="space-y-2">
					{rows.map((row) => (
						<li key={`${row.type}:${row.name}:${row.content}`}>
							<DnsInstructionCard instruction={toDnsHostInstruction(hostname, row)} />
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function authTips(dkimSelector?: string): Record<DnsAuthRecord, string> {
	return {
		mx: "In Cloudflare DNS, Priority and Mail server are separate fields. Copy each value below.",
		spf: "If an SPF TXT already exists, merge into one v=spf1 string — do not create two SPF records on @.",
		dkim:
			dkimSelector === "mail"
				? "Postfix generates this key automatically for every domain. Copy Content once it appears (refresh details after ~30s)."
				: "Mailflare cannot invent this key — Cloudflare generates it when you onboard the domain for Email Sending.",
		dmarc: "Name is usually _dmarc (not the full hostname). Start with p=none while monitoring.",
	};
}

function dkimSteps(hostname: string, selector?: string): string[] {
	if (selector === "mail") {
		return [
			"Ensure SMTP_URL=smtp://postfix:587 and the postfix service is running.",
			"Add or refresh this domain in Mailflare — it is written to outbound/sender-domains.txt automatically.",
			"Wait up to ~30s for Postfix to generate OpenDKIM keys, then refresh Domain details.",
			`Copy the Content for ${selector}._domainkey and publish it as a TXT at your DNS host.`,
			"No POSTFIX_ALLOWED_SENDER_DOMAINS env var is required — every registered domain is included.",
		];
	}
	return [
		"Open the operator Cloudflare dashboard (the account where CF_TOKEN / CF_ACCOUNT_ID live).",
		"Go to Email → Email Sending (or Compute → Email Service → Email Sending).",
		`Click Onboard domain and enter ${hostname}.`,
		"Open Email Sending → Settings for that domain.",
		"Find the TXT named cf-bounce._domainkey — copy Content (starts with v=DKIM1; … p=…).",
		`In ${hostname} DNS, add Type TXT, Name cf-bounce._domainkey, paste that Content.`,
		"Do not use Email Routing’s DKIM (cf2024-1._domainkey) — that is a different selector.",
	];
}

export default function DomainDnsDetails({
	domain,
	dns,
	onSetup,
	onVerify,
	setupRecord,
	setupMessage,
}: DomainDnsDetailsProps) {
	const audit = dns.audit;
	const manual = domain.zoneId === "manual";
	const needsOwnership = manual && domain.status === "pending";
	const subdomain = dns.sendingSubdomain;
	const sendingOk = subdomain ? dns.sendingEnabled : manual ? dns.sendingEnabled || domain.sendingEnabled : domain.sendingEnabled;
	const sendingLabel = subdomain
		? `Sending for ${subdomain.name} is ${dns.sendingEnabled ? "enabled" : "disabled"}`
		: manual
			? sendingOk
				? dns.dkimSelector === "mail"
					? "Outbound via Postfix — publish SPF and mail._domainkey DKIM for deliverability"
					: "Outbound is configured on this server — finish Cloudflare Email Sending DNS (SPF/DKIM) for deliverability"
				: "Outbound is not configured (set SMTP_URL to postfix, or CF_TOKEN + CF_ACCOUNT_ID)"
			: "Sending has not configured for this domain";
	const checklist = [...dns.routing.missing, ...dns.routing.records, ...dns.sending];
	const bounceRows = bounceSpfRecords(checklist);
	const routingOk = manual
		? audit?.mx.status === "ok"
		: dns.routing.missing.length === 0 && (dns.routing.records.length > 0 || domain.routingEnabled);
	const expectedMx = checklist.find((row) => (row.type ?? "").toUpperCase() === "MX");
	const expectedMxHost = expectedMx?.content?.replace(/^\d+\s+/, "").trim();
	const routingLabel = routingOk
		? manual
			? `MX points to Mailflare (${audit?.mx.found[0] ?? "ok"})`
			: "Email routing is configured"
		: manual && audit?.mx.found?.length
			? `Wrong MX (${audit.mx.found.join(", ")}) — replace with ${expectedMxHost ?? "MAIL_HOSTNAME"}`
			: dns.routing.missing.length > 0
				? `${dns.routing.missing.length} DNS record${dns.routing.missing.length === 1 ? "" : "s"} to publish for inbound`
				: "No routing DNS records found";

	/** Missing rows stay open so Setup instructions are visible without an extra click. */
	const [collapsed, setCollapsed] = useState<Partial<Record<DnsAuthRecord | "sending", boolean>>>({});
	const [cloudflareSetupOpen, setCloudflareSetupOpen] = useState(false);

	function isOpen(key: DnsAuthRecord | "sending", defaultOpen: boolean) {
		const value = collapsed[key];
		if (value === undefined) return defaultOpen;
		return !value;
	}

	function toggle(key: DnsAuthRecord | "sending", defaultOpen: boolean) {
		setCollapsed((prev) => ({ ...prev, [key]: isOpen(key, defaultOpen) }));
	}

	return (
		<div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
			{needsOwnership && (
				<section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
					<p className="text-sm font-medium text-amber-900">Ownership verification required</p>
					<p className="mt-1 text-xs text-amber-800">
						Add this TXT at your DNS host (Hostinger: DNS Zone → Manage → Add Record). Use Name{" "}
						<code className="rounded bg-white/80 px-1">_mailflare-verify</code> — not the full hostname —
						then click Verify ownership.
					</p>
					{dns.ownershipTxt ? (
						<div className="mt-3">
							<DnsInstructionCard
								instruction={{
									...toDnsHostInstruction(domain.hostname, dns.ownershipTxt),
									title: "TXT — ownership verification",
									note: "TTL can stay Auto / 3600. DNS can take a few minutes to propagate before Verify succeeds.",
								}}
							/>
						</div>
					) : (
						<p className="mt-3 text-xs text-amber-900">
							No verification token found yet. Re-add the domain or refresh details after MongoDB is
							connected.
						</p>
					)}
					{onVerify && (
						<Button type="button" size="sm" className="mt-3" onClick={onVerify}>
							Verify ownership
						</Button>
					)}
				</section>
			)}

			{audit && (
				<section>
					<h2 className="text-base font-semibold text-neutral-900">Domain setup</h2>
					<p className="mt-0.5 text-sm text-neutral-500">
						Review routing, sending, and DNS authentication. For manual domains, each missing check shows the
						exact Type / Name / Value to paste at your DNS host.
					</p>
					<ul className="mt-3 space-y-2">
						<li
							className={`grid gap-3 rounded-xl px-4 py-3 text-sm sm:grid-cols-[auto_minmax(8rem,14rem)_minmax(0,1fr)_auto] sm:items-start ${routingOk ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
						>
							{routingOk ? (
								<span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-white">
									<Check className="h-4 w-4" />
								</span>
							) : (
								<span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70">
									<AlertTriangle className="h-4 w-4 text-red-600" />
								</span>
							)}
							<span className="min-w-0">
								<span className="block font-medium text-neutral-900">Email Routing</span>
								<span className="block text-xs text-neutral-500">Routes incoming email to Mailflare</span>
							</span>
							<span className="min-w-0 break-all text-neutral-500">
								{routingOk
									? routingLabel
									: manual
										? "Use Setup on the MX record below — inbound needs that MX published"
										: routingLabel}
							</span>
						</li>

						<li
							className={`grid gap-3 rounded-xl px-4 py-3 text-sm sm:grid-cols-[auto_minmax(8rem,14rem)_minmax(0,1fr)_auto] sm:items-start ${sendingOk ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
						>
							{sendingOk ? (
								<span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-white">
									<Check className="h-4 w-4" />
								</span>
							) : (
								<span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70">
									<AlertTriangle className="h-4 w-4 text-red-600" />
								</span>
							)}
							<span className="min-w-0">
								<span className="block font-medium text-neutral-900">Email Sending</span>
								<span className="block text-xs text-neutral-500">Sends outgoing email from this domain</span>
							</span>
							<span className="min-w-0 break-all text-neutral-500">{sendingLabel}</span>
							{manual && bounceRows.length > 0 && (
								<>
									<Button
										variant="outline"
										size="sm"
										className="shrink-0 bg-white"
										onClick={() => toggle("sending", true)}
									>
										{isOpen("sending", true) ? "Hide" : "Setup"}
									</Button>
									{isOpen("sending", true) && (
										<ManualDnsPanel
											title="Cloudflare Email Sending bounce SPF"
											body="Also onboard the domain under Cloudflare Email Sending, then finish DKIM below."
											rows={bounceRows}
											hostname={domain.hostname}
										/>
									)}
								</>
							)}
						</li>

						{dnsAuthRecords.map((record) => {
							const item = audit[record];
							const ok = item.status === "ok";
							const defaultOpen = manual && !ok;
							const open = isOpen(record, defaultOpen);
							const setupRows = recordsForAuthCheck(record, checklist, item.name);

							return (
								<li
									key={record}
									className={`grid gap-3 rounded-xl px-4 py-3 text-sm sm:grid-cols-[auto_minmax(8rem,14rem)_minmax(0,1fr)_auto] sm:items-start ${getDnsAuthItemClass(item.status)}`}
								>
									{ok ? (
										<span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-white">
											<Check className="h-4 w-4" />
										</span>
									) : (
										<span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70">
											<AlertTriangle
												className={`h-4 w-4 ${item.status === "missing" ? "text-red-600" : "text-neutral-400"}`}
											/>
										</span>
									)}
									<span className="min-w-0">
										<span className="block font-medium text-neutral-900">{item.label} record</span>
										<span className="block text-xs text-neutral-500">{dnsAuthDescriptions[record]}</span>
									</span>

									{ok ? (
										<span className="min-w-0 break-all text-neutral-500">
											{item.found.length > 0 ? item.found.join(", ") : item.name}
										</span>
									) : manual ? (
										<>
											{item.found.length > 0 && (
												<span className="min-w-0 break-all text-xs text-amber-800 sm:col-start-3">
													Found in DNS (not Mailflare): {item.found.join(", ")}
												</span>
											)}
											<Button
												variant="outline"
												size="sm"
												className="shrink-0 bg-white"
												onClick={() => toggle(record, defaultOpen)}
											>
												{open ? "Hide" : "Setup"}
											</Button>
										</>
									) : (
										<Button
											variant="outline"
											size="sm"
											className="shrink-0 bg-white"
											disabled={setupRecord === record}
											onClick={() => onSetup?.(record)}
										>
											{setupRecord === record ? "Setting up..." : "Setup"}
										</Button>
									)}

									{manual && !ok && open && (
										<div className="col-span-full space-y-2">
											<ManualDnsPanel
												title={`Add the ${item.label} record at your DNS host`}
												body={authTips(dns.dkimSelector)[record]}
												rows={setupRows}
												hostname={domain.hostname}
											/>
											{record === "dkim" && (
												<ol className="list-decimal space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 pl-8 text-xs text-amber-950">
													<li className="font-medium text-amber-900 list-none -ml-4 mb-1">
														How to get the DKIM Content value
													</li>
													{dkimSteps(domain.hostname, dns.dkimSelector).map((step) => (
														<li key={step}>{step}</li>
													))}
												</ol>
											)}
										</div>
									)}
								</li>
							);
						})}
					</ul>

					{manual && (
						<div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-700">
							<p className="font-medium text-neutral-900">How to use Copy</p>
							<p className="mt-1">
								Each field has its own Copy button. For MX, copy <strong>Name</strong> as{" "}
								<code className="rounded bg-white px-1">@</code>, <strong>Priority</strong> and{" "}
								<strong>Mail server</strong> from the MX row above — never paste the combined{" "}
								<code className="rounded bg-white px-1">10 hostname</code> string into the mail-server
								field.
							</p>
							<button
								type="button"
								className="mt-2 text-blue-700 underline-offset-2 hover:underline"
								onClick={() => setCloudflareSetupOpen((v) => !v)}
							>
								{cloudflareSetupOpen ? "Hide DNS name map" : "Show DNS name map"}
							</button>
							{cloudflareSetupOpen && (
								<ul className="mt-2 list-disc space-y-1 pl-4 text-neutral-600">
									<li>
										Apex hosts use Name <code>@</code> (not {domain.hostname}).
									</li>
									<li>
										<code>_mailflare-verify.{domain.hostname}</code> → Name{" "}
										<code>_mailflare-verify</code>
									</li>
									<li>
										<code>_dmarc.{domain.hostname}</code> → Name <code>_dmarc</code>
									</li>
									{dns.dkimSelector === "mail" ? (
										<li>
											<code>mail._domainkey.{domain.hostname}</code> → Name <code>mail._domainkey</code>
										</li>
									) : (
										<>
											<li>
												<code>cf-bounce.{domain.hostname}</code> → Name <code>cf-bounce</code>
											</li>
											<li>
												<code>cf-bounce._domainkey.{domain.hostname}</code> → Name{" "}
												<code>cf-bounce._domainkey</code>
											</li>
										</>
									)}
								</ul>
							)}
						</div>
					)}
					{setupMessage && <p className="mt-2 text-xs text-red-600">{setupMessage}</p>}
				</section>
			)}
		</div>
	);
}
