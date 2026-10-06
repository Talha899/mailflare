import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { InboxThreadingSettings } from "@/components/settings/inbox-threading-settings";
import { RecipientAddressSettings } from "@/components/settings/recipient-address-settings";
import { InboxReadingLayoutSettings } from "@/components/settings/inbox-reading-layout-settings";
import { InboxShortcutsSettings } from "@/components/settings/inbox-shortcuts-settings";
import { MailboxAutoReplyForm } from "@/components/settings/mailbox-auto-reply-form";
import { SpamFilterSettings } from "@/components/settings/spam-filter-settings";
import { BrowserNotificationSettings } from "@/components/settings/browser-notification-settings";

export default function SettingsInboxPage() {
	return (
		<div className="space-y-8 py-4">
			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-[var(--foreground)]">Inbox experience</h2>
					<p className="mt-1 text-sm text-[var(--muted-foreground)]">Choose how you read and interact with email.</p>
				</div>
				<div className="divide-y divide-[var(--border)] rounded-3xl bg-[var(--card)] p-6">
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-[var(--foreground)]">Appearance</h3>
							<p className="mt-1 text-sm text-[var(--muted-foreground)]">Choose a light or dark interface.</p>
						</div>
						<AppearanceSettings />
					</div>
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-[var(--foreground)]">Reading layout</h3>
							<p className="mt-1 text-sm text-[var(--muted-foreground)]">Choose how open emails appear.</p>
						</div>
						<InboxReadingLayoutSettings />
					</div>
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-[var(--foreground)]">Threading</h3>
							<p className="mt-1 text-sm text-[var(--muted-foreground)]">Choose how emails are organized in your inbox.</p>
						</div>
						<InboxThreadingSettings />
					</div>
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-[var(--foreground)]">Addresses</h3>
							<p className="mt-1 text-sm text-[var(--muted-foreground)]">Choose how recipient addresses appear when you read mail.</p>
						</div>
						<RecipientAddressSettings />
					</div>
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-[var(--foreground)]">Shortcuts</h3>
							<p className="mt-1 text-sm text-[var(--muted-foreground)]">Choose whether keyboard shortcuts are active.</p>
						</div>
						<InboxShortcutsSettings />
					</div>
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-[var(--foreground)]">Notifications</h3>
							<p className="mt-1 text-sm text-[var(--muted-foreground)]">Choose how you hear about new email.</p>
						</div>
						<BrowserNotificationSettings />
					</div>
				</div>
			</section>
			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-[var(--foreground)]">Message handling</h2>
					<p className="mt-1 text-sm text-[var(--muted-foreground)]">Manage spam protection and automatic replies.</p>
				</div>
				<div className="divide-y divide-[var(--border)] rounded-3xl bg-[var(--card)] p-6">
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-[var(--foreground)]">Spam protection</h3>
							<p className="mt-1 text-sm text-[var(--muted-foreground)]">Control local spam analysis for incoming messages.</p>
						</div>
						<SpamFilterSettings />
					</div>
					<div className="py-6 first:pt-0 last:pb-0">
						<div className="mb-4">
							<h3 className="text-base font-semibold text-[var(--foreground)]">Automatic response</h3>
							<p className="mt-1 text-sm text-[var(--muted-foreground)]">
								Configure the subject and message for the inbox currently selected above.
							</p>
						</div>
						<MailboxAutoReplyForm />
					</div>
				</div>
			</section>
		</div>
	);
}
