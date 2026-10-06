import { InboxRules } from "@/components/settings/inbox-rules";

/**
 * Mailbox rules only. Domain-wide routing (catch-alls, rejects, forwarding for
 * every address) is an administrator tool and lives in the admin console.
 */
export default function SettingsRulesPage() {
	return (
		<div className="space-y-8">
			<InboxRules />
		</div>
	);
}
