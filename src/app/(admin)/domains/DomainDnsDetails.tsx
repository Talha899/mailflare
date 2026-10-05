"use client";

import { useState } from "react";
import { AlertTriangle, Check, CheckCheck, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	dnsAuthDescriptions,
	dnsAuthRecords,
	getDnsAuthItemClass,
	recordsForAuthCheck,
} from "./utils";
import type { DnsAuthRecord, DnsRecord, DomainDnsDetailsProps } from "./types";

function DnsRecordCard({ record }: { record: DnsRecord }) {
	const [copied, setCopied] = useState<"name" | "content" | null>(null);
	const type = record.type ?? "TXT";
	const name = record.name ?? "";
	const content = record.content ?? "";

	async function copy(kind: "name" | "content", value: string) {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(kind);
			window.setTimeout(() => setCopied(null), 1500);
		} catch {
			/* clipboard may be unavailable */
		}
	}

	return (
		<div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800">
			<div className="flex flex-wrap items-center gap-2">
				<span className="rounded bg-neutral-100 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-neutral-700">
					{type}
				</span>
				<span className="min-w-0 flex-1 break-all font-medium text-neutral-900">{name}</span>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 shrink-0 px-2 text-neutral-600"
					onClick={() => void copy("name", name)}
					aria-label="Copy DNS name"
				>
					{copied === "name" ? <CheckCheck className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
				</Button>
			</div>
			<div className="mt-2 flex items-start gap-2">
				<p className="min-w-0 flex-1 break-all font-mono text-neutral-900">{content}</p>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 shrink-0 px-2 text-neutral-600"
					onClick={() => void copy("content", content)}
					aria-label="Copy DNS value"
				>
					{copied === "content" ? <CheckCheck className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
				</Button>
			</div>
			{type === "MX" && (
				<p className="mt-1 text-[11px] text-neutral-500">
					In Cloudflare DNS: Type MX, Name <code>@</code>, Priority from the value (usually 10), Target{" "}
					<code>mail.aiorders.io</code> (or the host after the priority).
				</p>
			)}
		</div>
	);
}

function ManualSetupPanel({
	record,
	rows,
	hostname,
}: {
	record: DnsAuthRecord;
	rows: DnsRecord[];
	hostname: string;
}) {
	const tips: Record<DnsAuthRecord, string> = {
		mx: `Point ${hostname} mail to your Mailflare host so inbound delivery works.`,
		spf: `Add one SPF TXT on ${hostname}. If an SPF record already exists, merge into a single v=spf1 string — do not create two SPF records.`,
		dkim: `Onboard ${hostname} in Cloudflare Email Sending first, then paste the DKIM value Cloudflare shows for cf-bounce._domainkey.`,
		dmarc: `Create a TXT at _dmarc.${hostname}. Start with p=none while you monitor delivery.`,
	};

	return (
		<div className="col-span-full mt-1 space-y-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-3 text-xs text-neutral-800">
			<p className="font-medium text-neutral-900">Add this at your DNS host for {hostname}</p>
			<p className="text-neutral-600">{tips[record]}</p>
			{rows.length === 0 ? (
				<p className="text-amber-800">No suggested record for this check yet. Refresh DNS details after verifying ownership.</p>
			) : (
				<ul className="space-y-2">
					{rows.map((row) => (
						<li key={`${row.type}:${row.name}:${row.content}`}>
							<DnsRecordCard record={row} />
						</li>
					))}
				</ul>
			)}
		</div>
	);
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
				? "Outbound is configured on this server — finish Cloudflare Email Sending DNS (SPF/DKIM) for deliverability"
				: "Outbound is not configured (set CF_TOKEN + CF_ACCOUNT_ID or SMTP_URL)"
			: "Sending has not configured for this domain";
	const missingRecords = [...dns.routing.missing, ...dns.sending];
	const checklist = missingRecords.length ? missingRecords : [...dns.routing.records, ...dns.sending];
	const routingOk = manual
		? audit?.mx.status === "ok"
		: dns.routing.missing.length === 0 && (dns.routing.records.length > 0 || domain.routingEnabled);
	const routingLabel = routingOk
		? manual
			? `MX points to Mailflare (${audit?.mx.found[0] ?? "ok"})`
			: "Email routing is configured"
		: dns.routing.missing.length > 0
			? `${dns.routing.missing.length} DNS record${dns.routing.missing.length === 1 ? "" : "s"} to publish for inbound`
			: "No routing DNS records found";
	const [openManualSetup, setOpenManualSetup] = useState<DnsAuthRecord | null>(null);

	return (
		<div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
			{needsOwnership && (
				<section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
					<p className="text-sm font-medium text-amber-900">Ownership verification required</p>
					<p className="mt-1 text-xs text-amber-800">
						Add the Mailflare TXT verification record shown in the missing DNS list, then verify ownership.
					</p>
					{onVerify && (
						<Button type="button" size="sm" className="mt-3" onClick={onVerify}>
							Verify ownership
						</Button>
					)}
				</section>
			)}
			{manual && missingRecords.length > 0 && (
				<section className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
					<p className="text-sm font-medium text-neutral-900">Publish these DNS records</p>
					<p className="mt-1 text-xs text-neutral-600">
						Create them at the DNS host for {domain.hostname}. Or click <strong>Setup</strong> under each
						check below to see that record alone with copy buttons.
					</p>
					<ul className="mt-3 space-y-2">
						{missingRecords.map((record) => (
							<li key={`${record.type}:${record.name}:${record.content}`}>
								<DnsRecordCard record={record} />
							</li>
						))}
					</ul>
				</section>
			)}
			{audit && (
				<section>
					<h2 className="text-base font-semibold text-neutral-900">Domain setup</h2>
					<p className="mt-0.5 text-sm text-neutral-500">
						Review routing, sending, and DNS authentication for reliable email delivery.
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
							<span className="min-w-0 break-all text-neutral-500">{routingLabel}</span>
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
						</li>

						{dnsAuthRecords.map((record) => {
							const item = audit[record];
							const ok = item.status === "ok";
							const expanded = openManualSetup === record;
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
											<AlertTriangle className={`h-4 w-4 ${item.status === "missing" ? "text-red-600" : "text-neutral-400"}`} />
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
										<Button
											variant="outline"
											size="sm"
											className="shrink-0 bg-white"
											onClick={() => setOpenManualSetup(expanded ? null : record)}
										>
											{expanded ? "Hide" : "Setup"}
										</Button>
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

									{manual && !ok && expanded && (
										<ManualSetupPanel record={record} rows={setupRows} hostname={domain.hostname} />
									)}
								</li>
							);
						})}
					</ul>
					{manual && (
						<p className="mt-3 text-xs text-neutral-500">
							Manual domain: Mailflare cannot write DNS. Use <strong>Setup</strong> on each missing row to
							see Type / Name / Value, then add them at the DNS host for {domain.hostname}. Set{" "}
							<code className="text-[11px]">CF_TOKEN</code> in Coolify for outbound sending.
						</p>
					)}
					{setupMessage && <p className="text-xs text-red-600">{setupMessage}</p>}
				</section>
			)}
		</div>
	);
}
