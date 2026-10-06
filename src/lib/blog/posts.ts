export type BlogBlock =
	| { type: "p"; text: string }
	| { type: "h2"; text: string }
	| { type: "ul"; items: string[] }
	| { type: "img"; src: string; alt: string; caption?: string };

export type BlogPost = {
	slug: string;
	title: string;
	excerpt: string;
	date: string;
	category: string;
	cover: string;
	minutes: number;
	body: BlogBlock[];
};

export const blogPosts: BlogPost[] = [
	{
		slug: "custom-domain-email-without-google",
		title: "Custom domain email without Google Workspace",
		excerpt: "Run you@yourdomain.com on a server you control, with MX you publish yourself.",
		date: "2026-09-02",
		category: "Product",
		cover: "/blog/custom-domain-email-without-google.svg",
		minutes: 6,
		body: [
			{ type: "p", text: "Most teams still rent their address from Google or Microsoft. That works until you want the mailbox to live next to your own app, your own DNS, and your own backup." },
			{ type: "p", text: "Dispatch is webmail for a hostname you already own. You add the domain, publish MX, SPF, and DKIM at your DNS host, and create mailboxes. Incoming mail lands in the inbox. Outgoing mail goes out through SMTP on the same machine." },
			{ type: "h2", text: "What you actually publish" },
			{ type: "ul", items: ["MX pointing at your mail hostname", "SPF that authorizes that host", "DKIM from your outbound signer", "DMARC at p=none while you watch reports"] },
			{ type: "p", text: "Nothing here requires a Cloudflare zone or Google admin console. If DNS is at Hostinger, Namecheap, or Route 53, you paste the same records." },
		],
	},
	{
		slug: "mx-records-explained",
		title: "MX records, without the folklore",
		excerpt: "Priority and mail server are two fields. Paste them separately or mail never arrives.",
		date: "2026-09-04",
		category: "DNS",
		cover: "/blog/mx-records-explained.svg",
		minutes: 5,
		body: [
			{ type: "p", text: "An MX record is a pointer: “mail for this domain is accepted at that host.” The number in front is priority. Lower numbers are tried first." },
			{ type: "p", text: "Dispatch shows something like 10 mail.codenak.com. That is not one string to dump into a single DNS field. Most panels want Name, Priority, and Mail server as three inputs." },
			{ type: "h2", text: "Apex vs hostname" },
			{ type: "p", text: "For example.com, Name is usually @. For mail.example.com it is mail. Never paste 10 mail.codenak.com into the mail-server box — that host will not resolve." },
			{ type: "p", text: "After you save, wait for public DNS. Dispatch’s domain page audits live MX so you can see whether the world already agrees with what you published." },
		],
	},
	{
		slug: "spf-dkim-dmarc-checklist",
		title: "SPF, DKIM, and DMARC as a short checklist",
		excerpt: "Three TXT records. Merge SPF, wait for DKIM, start DMARC at p=none.",
		date: "2026-09-06",
		category: "DNS",
		cover: "/blog/spf-dkim-dmarc-checklist.svg",
		minutes: 7,
		body: [
			{ type: "p", text: "Receiving mail is MX. Sending mail that other inboxes will accept is SPF, DKIM, and DMARC." },
			{ type: "h2", text: "SPF" },
			{ type: "p", text: "One v=spf1 record on the apex. If a record already exists, merge mechanisms. Two SPF records on @ is a common way to fail authentication." },
			{ type: "h2", text: "DKIM" },
			{ type: "p", text: "Dispatch on Coolify uses the Postfix selector mail. After the domain is added, wait about 30 seconds, refresh domain details, and copy the TXT for mail._domainkey." },
			{ type: "h2", text: "DMARC" },
			{ type: "p", text: "Start with p=none on _dmarc. Tighten later when you trust the reports. Do not jump to p=reject on day one." },
		],
	},
	{
		slug: "self-host-email-on-coolify",
		title: "Self-hosting Dispatch on Coolify",
		excerpt: "One compose file, managed Mongo, S3 for blobs, Postfix for outbound.",
		date: "2026-09-08",
		category: "Ops",
		cover: "/blog/self-host-email-on-coolify.svg",
		minutes: 8,
		body: [
			{ type: "p", text: "Coolify deploys docker-compose.coolify.yml. The web app listens on 3000 behind HTTPS. Port 25 must reach the container if you want MX on that same host." },
			{ type: "ul", items: ["APP_URL — public HTTPS origin", "MAIL_HOSTNAME — what MX should point at", "MONGO_URL — tenant metadata in SaaS mode", "S3_* or STORAGE_* — MIME, attachments, backups", "SMTP_URL=smtp://postfix:587"] },
			{ type: "p", text: "Object storage can be any S3-compatible API. STORAGE_FOLDER maps to the key prefix inside the bucket." },
			{ type: "p", text: "After deploy, confirm logs show Object storage: S3 and MongoDB connected, then open /signup." },
		],
	},
	{
		slug: "catch-all-routing-done-right",
		title: "Catch-all routing that does not swallow real mailboxes",
		excerpt: "Reject first, then exact addresses, then catch-all. Order is the product.",
		date: "2026-09-10",
		category: "Routing",
		cover: "/blog/catch-all-routing-done-right.svg",
		minutes: 6,
		body: [
			{ type: "p", text: "A * rule that stores everything looks convenient until it hides info@ because the catch-all ran first." },
			{ type: "p", text: "Dispatch evaluates domain rules in phases: reject, then exact mailbox and alias lookup, then forward or store fallbacks. Real mailboxes stay reachable." },
			{ type: "h2", text: "Two scopes" },
			{ type: "p", text: "Domain rules decide delivery, forwarding, or rejection while the address is resolved. Mailbox rules run after delivery and pick a folder. Mixing those scopes is the usual support ticket." },
		],
	},
	{
		slug: "jmap-vs-imap",
		title: "JMAP when you want a modern client, IMAP when you must",
		excerpt: "Dispatch speaks JMAP Mail. IMAP import still exists for bringing old mail in.",
		date: "2026-09-12",
		category: "Clients",
		cover: "/blog/jmap-vs-imap.svg",
		minutes: 6,
		body: [
			{ type: "p", text: "JMAP is JSON over HTTPS with API keys. Clients can query, import drafts, and sync state without a long-lived IMAP connection." },
			{ type: "p", text: "IMAP remains the language of Thunderbird and Apple Mail. Dispatch can import from IMAP. On the Docker runtime that path needs a socket implementation; uploading .eml files is the reliable option today." },
			{ type: "p", text: "If you are building an integration, start at /.well-known/jmap with a key that has the jmap scope." },
		],
	},
	{
		slug: "aliases-and-shared-mailboxes",
		title: "Aliases and shared mailboxes",
		excerpt: "One person, several addresses. Several people, one inbox. Both are first-class.",
		date: "2026-09-14",
		category: "Product",
		cover: "/blog/aliases-and-shared-mailboxes.svg",
		minutes: 5,
		body: [
			{ type: "p", text: "An alias is another local-part on a domain you already receive. Billing@ can land in the same mailbox as hello@ without a second login." },
			{ type: "p", text: "A shared mailbox is a real inbox with permissions: read only, send as, or full access. Support teams use this instead of forwarding everything to a personal Gmail." },
			{ type: "p", text: "Sending still uses the addresses the mailbox is allowed to use, so Reply-To and From stay honest." },
		],
	},
	{
		slug: "inbound-webhooks-for-apps",
		title: "Inbound webhooks for the rest of your stack",
		excerpt: "When a message is stored, Dispatch can POST JSON to your app and retry on failure.",
		date: "2026-09-16",
		category: "API",
		cover: "/blog/inbound-webhooks-for-apps.svg",
		minutes: 5,
		body: [
			{ type: "p", text: "Not every message belongs only in the webmail UI. Tickets, CRM notes, and pipelines want a copy as JSON." },
			{ type: "p", text: "Webhooks fire after inbound processing. Failures are recorded and retried with backoff on the outbound queue — there is no third queue to configure." },
			{ type: "p", text: "You can retry a delivery by hand from admin if an endpoint was down during a deploy." },
		],
	},
	{
		slug: "sending-mail-through-smtp",
		title: "Sending through SMTP on the same host",
		excerpt: "SMTP_URL points at Postfix. DKIM is generated per domain. No Cloudflare sending quota.",
		date: "2026-09-18",
		category: "Ops",
		cover: "/blog/sending-mail-through-smtp.svg",
		minutes: 6,
		body: [
			{ type: "p", text: "On Coolify, outbound is smtp://postfix:587 on the compose network. Dispatch never talks to a cloud email sending API unless you point SMTP_URL somewhere else." },
			{ type: "p", text: "Each registered hostname is written into the outbound sender list. Postfix reloads. OpenDKIM mints a key. You copy the TXT from the domain page." },
			{ type: "p", text: "Large attachments become download links so the SMTP message stays under ordinary size limits. Set APP_URL so those links are public HTTPS." },
		],
	},
	{
		slug: "why-mail-hostname-matters",
		title: "Why MAIL_HOSTNAME has to be a real host",
		excerpt: "MX, SPF, and the HELO name all follow this one environment variable.",
		date: "2026-09-20",
		category: "Ops",
		cover: "/blog/why-mail-hostname-matters.svg",
		minutes: 4,
		body: [
			{ type: "p", text: "MAIL_HOSTNAME is the machine name other servers use when they deliver to you and when you introduce yourself on outbound SMTP." },
			{ type: "p", text: "If APP_URL is https://mail.codenak.com, MAIL_HOSTNAME should usually be mail.codenak.com. Point A/AAAA at the Coolify host, then MX at that name." },
			{ type: "p", text: "A mismatch — web on one name, MX on another that does not resolve — is the fastest way to lose inbound mail after a domain cutover." },
		],
	},
	{
		slug: "password-reset-from-your-domain",
		title: "Password reset mail from your own domain",
		excerpt: "Reset links come from an admin mailbox on a sending-ready domain, not a third-party ESP.",
		date: "2026-09-22",
		category: "Security",
		cover: "/blog/password-reset-from-your-domain.svg",
		minutes: 4,
		body: [
			{ type: "p", text: "Reset mail uses reset_email on the user, a hashed one-use link, and a 30-minute window. Redeeming it revokes every session." },
			{ type: "p", text: "The message is sent from the first admin mailbox on a domain that can send. Nothing lands in Sent. Webhooks do not fire." },
			{ type: "p", text: "If no domain can send yet, the request still returns 200 and a warning is logged. Publish SPF and DKIM before you need a reset in production." },
		],
	},
	{
		slug: "ai-drafts-with-human-approval",
		title: "AI drafts that still need a human",
		excerpt: "Bring your own OpenRouter or OpenAI key. Sparkles stays hidden until a mailbox is allowed.",
		date: "2026-09-24",
		category: "Product",
		cover: "/blog/ai-drafts-with-human-approval.svg",
		minutes: 5,
		body: [
			{ type: "p", text: "The assistant is optional. Paste a provider URL, API key, and a tool-calling model in admin. Then allow specific mailboxes." },
			{ type: "p", text: "Until that is saved, the Sparkles control is not shown. Sending a draft still requires someone to approve it." },
			{ type: "p", text: "Usage is recorded so you can see tokens and estimated spend. Rates are whatever you typed next to each model." },
		],
	},
	{
		slug: "migrating-from-google-workspace",
		title: "Leaving Google Workspace without losing the address",
		excerpt: "Keep the domain, change MX last, import old mail as files if IMAP is blocked.",
		date: "2026-09-26",
		category: "Migration",
		cover: "/blog/migrating-from-google-workspace.svg",
		minutes: 7,
		body: [
			{ type: "p", text: "Create the Dispatch mailboxes first. Export Google Takeout or download .eml. Import those files. Only then change MX." },
			{ type: "p", text: "Changing MX before the new host answers on port 25 drops mail. Changing it after mailboxes exist is a cutover, not an outage." },
			{ type: "p", text: "Lower TTL on MX a day ahead. Watch the domain audit until public DNS matches the checklist. Then turn off Google routing." },
		],
	},
	{
		slug: "dns-propagation-and-verify",
		title: "DNS propagation and the Verify button",
		excerpt: "TXT ownership is a public lookup. Waiting a minute is cheaper than re-adding the domain.",
		date: "2026-09-28",
		category: "DNS",
		cover: "/blog/dns-propagation-and-verify.svg",
		minutes: 4,
		body: [
			{ type: "p", text: "SaaS mode asks for a TXT at _mailflare-verify. The name in the panel is usually _mailflare-verify, not the full hostname." },
			{ type: "p", text: "Verify queries public DNS. If you just saved the record, wait. Most misses are TTL, wrong name, or quotes wrapped around the token." },
			{ type: "p", text: "Once ownership is confirmed, the rest of the checklist — MX, SPF, DKIM — is still yours to publish. Dispatch does not write your zone." },
		],
	},
	{
		slug: "attachment-download-links",
		title: "When attachments become links",
		excerpt: "Oversized files are stored and sent as expiring HTTPS URLs instead of MIME bloat.",
		date: "2026-09-30",
		category: "Product",
		cover: "/blog/attachment-download-links.svg",
		minutes: 4,
		body: [
			{ type: "p", text: "SMTP and many relays dislike huge encoded attachments. Dispatch stores large files in object storage and puts download links in the body." },
			{ type: "p", text: "Links expire after 30 days. Anyone who has the URL can download until then, so treat them like a shared file, not a secret." },
			{ type: "p", text: "APP_URL must be your public HTTPS origin or the link will point at localhost and fail for the recipient." },
		],
	},
	{
		slug: "two-factor-on-webmail",
		title: "TOTP on the mailbox login",
		excerpt: "Standard authenticator apps. Recovery codes. No extra vendor.",
		date: "2026-10-01",
		category: "Security",
		cover: "/blog/two-factor-on-webmail.svg",
		minutes: 4,
		body: [
			{ type: "p", text: "Enrollment stores a TOTP secret but only counts after you confirm a code. Login then returns a short-lived challenge instead of a session." },
			{ type: "p", text: "You finish with an authenticator code or a recovery code. Password changes and admin resets drop every session." },
			{ type: "p", text: "There is no SMS path. That is intentional." },
		],
	},
	{
		slug: "backups-and-restore",
		title: "Backups that restore in foreign-key order",
		excerpt: "JSON backups of real tables. FTS indexes rebuild. Object storage holds the MIME.",
		date: "2026-10-02",
		category: "Ops",
		cover: "/blog/backups-and-restore.svg",
		minutes: 5,
		body: [
			{ type: "p", text: "Admin can export a JSON backup of application tables in dependency order so restore inserts parents before children." },
			{ type: "p", text: "Search index tables are derived and skipped. They refill from messages after restore." },
			{ type: "p", text: "Raw MIME and attachments live in the S3 prefix. A database-only backup without the bucket is not a full restore." },
		],
	},
	{
		slug: "open-signup-for-client-mail",
		title: "Open signup for client mailboxes",
		excerpt: "SaaS mode lets a customer create an org, prove a domain, and start mail without a sales call.",
		date: "2026-10-03",
		category: "Product",
		cover: "/blog/open-signup-for-client-mail.svg",
		minutes: 5,
		body: [
			{ type: "p", text: "With SAAS_MODE on, /signup creates an organization and an admin user. Onboarding asks for a domain and a first mailbox." },
			{ type: "p", text: "Domains need TXT proof. Mail still only moves after MX points at MAIL_HOSTNAME." },
			{ type: "p", text: "There is no Stripe in this version. Plan limits can exist as placeholders. You run the install; they run their domain." },
		],
	},
	{
		slug: "deliverability-after-you-leave-gmail",
		title: "Deliverability after you leave Gmail",
		excerpt: "New IPs have no reputation. Align SPF and DKIM, warm slowly, read DMARC.",
		date: "2026-10-04",
		category: "Deliverability",
		cover: "/blog/deliverability-after-you-leave-gmail.svg",
		minutes: 6,
		body: [
			{ type: "p", text: "Gmail’s reputation does not follow you. The Coolify host is a new sender as far as Gmail and Outlook are concerned." },
			{ type: "p", text: "Publish aligned SPF and DKIM. Keep DMARC at p=none. Send real one-to-one mail first, not a blast." },
			{ type: "p", text: "PTR, a consistent HELO, and a quiet complaint rate matter more than any dashboard badge. Dispatch will not invent those for you." },
		],
	},
	{
		slug: "running-dispatch-on-codenak",
		title: "Running Dispatch on mail.codenak.com",
		excerpt: "The production hostname, object store, and MX target for this install.",
		date: "2026-10-06",
		category: "Ops",
		cover: "/blog/running-dispatch-on-codenak.svg",
		minutes: 4,
		body: [
			{ type: "p", text: "This install’s public origin is https://mail.codenak.com. MAIL_HOSTNAME is mail.codenak.com. Object storage is the healudoc bucket at s3.codenak.com under the prod_mail prefix." },
			{ type: "p", text: "Customer domains still keep their own MX. They point at mail.codenak.com, not at Google, not at Cloudflare Email Routing." },
			{ type: "p", text: "When you add a domain, copy the checklist. When you ship a new image, redeploy Coolify. That is the whole update path." },
		],
	},
];

export function getBlogPost(slug: string) {
	return blogPosts.find((post) => post.slug === slug) ?? null;
}

export function listBlogPosts() {
	return [...blogPosts].sort((a, b) => (a.date < b.date ? 1 : -1));
}
