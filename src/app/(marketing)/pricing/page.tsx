import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
			<h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
			<p className="mt-3 text-lg leading-8 text-[var(--muted-foreground)]">
				This install is open signup. You bring a domain. There is no per-mailbox Stripe checkout in this version.
			</p>
			<div className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
				<p className="text-sm font-medium text-[var(--compose)]">Included</p>
				<ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--foreground)]">
					<li>Webmail, aliases, and shared mailboxes</li>
					<li>Manual DNS checklist for MX, SPF, DKIM, and DMARC</li>
					<li>SMTP send through the Coolify Postfix service</li>
					<li>JMAP and inbound webhooks</li>
					<li>Optional AI drafts with your own provider key</li>
				</ul>
				<Button asChild className="mt-8">
					<Link href="/signup">Create an account</Link>
				</Button>
			</div>
		</div>
	);
}
