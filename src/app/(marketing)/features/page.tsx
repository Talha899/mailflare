import type { Metadata } from "next";
import { Globe2, KeyRound, Route, Webhook } from "lucide-react";

export const metadata: Metadata = { title: "Features" };

const features = [
	{
		icon: Globe2,
		title: "Domains you paste records for",
		body: "Add a hostname. Copy MX, SPF, DKIM, and DMARC. Verify TXT in SaaS mode. Dispatch never writes your DNS zone.",
	},
	{
		icon: Route,
		title: "Routing in two scopes",
		body: "Domain rules reject, store, or forward while the address is resolved. Mailbox rules file mail after delivery.",
	},
	{
		icon: KeyRound,
		title: "JMAP and API keys",
		body: "Clients authenticate with a scoped API key. /.well-known/jmap is the discovery URL.",
	},
	{
		icon: Webhook,
		title: "Webhooks with retries",
		body: "Inbound events POST to your URL. Failures back off on the outbound queue and can be retried by hand.",
	},
];

export default function FeaturesPage() {
	return (
		<div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
			<h1 className="text-4xl font-semibold tracking-tight">What you get</h1>
			<p className="mt-3 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
				Webmail, routing, and outbound SMTP for mailboxes on domains you already operate.
			</p>
			<ul className="mt-12 grid gap-6 sm:grid-cols-2">
				{features.map((feature) => {
					const Icon = feature.icon;
					return (
						<li key={feature.title} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
							<Icon className="h-5 w-5 text-[var(--compose)]" />
							<h2 className="mt-4 text-lg font-semibold tracking-tight">{feature.title}</h2>
							<p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{feature.body}</p>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
