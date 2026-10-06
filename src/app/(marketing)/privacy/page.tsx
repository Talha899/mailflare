import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
			<h1 className="text-4xl font-semibold tracking-tight">Privacy</h1>
			<div className="mt-6 space-y-4 text-base leading-7 text-[var(--muted-foreground)]">
				<p>
					Mail you send and receive is stored on this install: SQLite for metadata, object storage for raw MIME and
					attachments. Organization records live in MongoDB when SaaS mode is on.
				</p>
				<p>
					If you enable the assistant, message content is sent to the AI provider whose key you saved. Drafts still
					require a person to send.
				</p>
				<p>
					Password reset links are hashed, single-use, and expire in 30 minutes. Sessions are revoked when a password
					changes.
				</p>
				<p>Attachment download links expire after 30 days. Anyone with a link can fetch the file until then.</p>
			</div>
		</div>
	);
}
