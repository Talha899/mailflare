import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dnsAuthDescriptions, dnsAuthRecords, getDnsAuthItemClass, getDnsAuthStatusLabel } from "./utils";
import type { DomainDnsDetailsProps } from "./types";

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
						Create them at the DNS host for {domain.hostname} (Cloudflare DNS, etc.). Without the MX record,
						inbound mail will not reach Mailflare. For Cloudflare Email Sending, also onboard the domain in
						the Cloudflare dashboard and paste the DKIM value Cloudflare shows.
					</p>
					<ul className="mt-3 space-y-2">
						{missingRecords.map((record) => (
							<li
								key={`${record.type}:${record.name}:${record.content}`}
								className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800"
							>
								<p>
									<span className="font-semibold">{record.type}</span>{" "}
									<span className="break-all text-neutral-600">{record.name}</span>
								</p>
								<p className="mt-1 break-all font-mono text-neutral-900">{record.content}</p>
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

									{ok ? <span className="min-w-0 break-all text-neutral-500">
										{item.found.length > 0 ? item.found.join(", ") : item.name}
									</span> : (
										<Button
											variant="outline"
											size="sm"
											className="shrink-0 bg-white"
											disabled={manual || setupRecord === record}
											title={
												manual
													? "DNS for this domain is managed manually"
													: `Create the ${item.label} record`
											}
											onClick={() => onSetup?.(record)}
										>
											{setupRecord === record ? "Setting up..." : "Setup"}
										</Button>
									)}
								</li>
							);
						})}
					</ul>
					{manual && (
						<div className="mt-3 space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-700">
							<p className="font-medium text-neutral-900">Why Setup is disabled</p>
							<p>
								This domain is not on your operator Cloudflare account. Mailflare cannot click
								Setup for you — add MX, SPF, DMARC, and DKIM at your DNS host (e.g. Cloudflare
								DNS for {domain.hostname}) and onboard the domain under Cloudflare Email Sending.
							</p>
							<p>
								Server credentials (<code className="text-[11px]">CF_TOKEN</code>,{" "}
								<code className="text-[11px]">CF_ACCOUNT_ID</code>) are set in Coolify, not in
								this UI. Use <strong>Mailboxes</strong> to create addresses after DNS is ready.
							</p>
						</div>
					)}
					{setupMessage && <p className="text-xs text-red-600">{setupMessage}</p>}
				</section>
			)}
		</div>
	);
}
