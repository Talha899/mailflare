import { EmailClientsSettings } from "@/components/settings/email-clients-settings";

export default function EmailAppsSettingsPage() {
	return <div className="space-y-8 py-4">
		<section className="space-y-4">
			<div>
				<h1 className="text-xl font-semibold text-[var(--foreground)]">App Passwords</h1>
				<p className="mt-1 text-sm text-[var(--muted-foreground)]">Use your mail from a desktop or mobile app over JMAP.</p>
			</div>
			<div className="space-y-4 rounded-3xl bg-[var(--card)] p-6">
				<EmailClientsSettings />
			</div>
		</section>
	</div>;
}
