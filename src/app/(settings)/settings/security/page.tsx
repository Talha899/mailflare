import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { MfaSettings } from "@/components/settings/mfa-settings";

export default function SecuritySettingsPage() {
	return <div className="space-y-8 py-4">
		<section className="space-y-4">
			<div>
				<h1 className="text-xl font-semibold text-[var(--foreground)]">Security</h1>
				<p className="mt-1 text-sm text-[var(--muted-foreground)]">Manage how you sign in to your account.</p>
			</div>
			<div className="space-y-4 rounded-3xl bg-[var(--card)] p-6">
				<div>
					<h2 className="text-lg font-semibold text-[var(--foreground)]">Change password</h2>
					<p className="mt-1 text-sm text-[var(--muted-foreground)]">
						Updates your account password (admin portal / dashboard). Mailbox IMAP and webmail passwords are separate.
					</p>
				</div>
				<ChangePasswordForm />
			</div>
			<div className="space-y-4 rounded-3xl bg-[var(--card)] p-6">
				<div>
					<h2 className="text-lg font-semibold text-[var(--foreground)]">Two-factor authentication</h2>
					<p className="mt-1 text-sm text-[var(--muted-foreground)]">Require a code from an authenticator app when signing in.</p>
				</div>
				<MfaSettings />
			</div>
		</section>
	</div>;
}
