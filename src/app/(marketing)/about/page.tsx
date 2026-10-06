import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
			<h1 className="text-4xl font-semibold tracking-tight">About</h1>
			<div className="mt-6 space-y-4 text-base leading-7 text-[var(--muted-foreground)]">
				<p>
					Dispatch is webmail for operators who already have a domain and a server. Mail is stored here. DNS stays in
					your registrar panel. Outbound is ordinary SMTP.
				</p>
				<p>
					This production hostname is mail.codenak.com. Customer domains point MX at that host and publish SPF and DKIM
					from the domain checklist.
				</p>
				<p>
					The product started as Mailflare. The workspace you see is Dispatch. The runtime on Coolify is Node, SQLite,
					Mongo for org metadata, and S3-compatible object storage for MIME.
				</p>
			</div>
		</div>
	);
}
