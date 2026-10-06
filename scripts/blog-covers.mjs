import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const covers = [
	["custom-domain-email-without-google", "#0f172a", "#38bdf8", "envelope"],
	["mx-records-explained", "#18181b", "#a1a1aa", "mx"],
	["spf-dkim-dmarc-checklist", "#020617", "#4ade80", "shield"],
	["self-host-email-on-coolify", "#0c0c0e", "#38bdf8", "server"],
	["catch-all-routing-done-right", "#14532d", "#bbf7d0", "route"],
	["jmap-vs-imap", "#1e3a5f", "#7dd3fc", "protocol"],
	["aliases-and-shared-mailboxes", "#27272a", "#e2e8f0", "users"],
	["inbound-webhooks-for-apps", "#0f172a", "#f472b6", "webhook"],
	["sending-mail-through-smtp", "#1c1917", "#fb923c", "send"],
	["why-mail-hostname-matters", "#164e63", "#67e8f9", "host"],
	["password-reset-from-your-domain", "#3f1d2e", "#f9a8d4", "key"],
	["ai-drafts-with-human-approval", "#1e1b4b", "#c4b5fd", "spark"],
	["migrating-from-google-workspace", "#111827", "#93c5fd", "move"],
	["dns-propagation-and-verify", "#0b1324", "#38bdf8", "dns"],
	["attachment-download-links", "#292524", "#fdba74", "paper"],
	["two-factor-on-webmail", "#14532d", "#86efac", "lock"],
	["backups-and-restore", "#1e293b", "#94a3b8", "disk"],
	["open-signup-for-client-mail", "#0f172a", "#38bdf8", "door"],
	["deliverability-after-you-leave-gmail", "#422006", "#fde68a", "inbox"],
	["running-dispatch-on-codenak", "#09090b", "#38bdf8", "mark"],
];

function motif(kind, accent) {
	switch (kind) {
		case "envelope":
			return `<rect x="360" y="220" width="480" height="300" rx="18" fill="none" stroke="${accent}" stroke-width="10"/>
				<path d="M360 220 L600 390 L840 220" fill="none" stroke="${accent}" stroke-width="10"/>`;
		case "mx":
			return `<text x="600" y="400" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace" font-size="120" fill="${accent}" font-weight="600">MX</text>
				<text x="600" y="470" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace" font-size="28" fill="${accent}" opacity="0.7">10 mail.example.com</text>`;
		case "shield":
			return `<path d="M600 150 L820 230 V390 C820 520 600 590 600 590 C600 590 380 520 380 390 V230 Z" fill="none" stroke="${accent}" stroke-width="10"/>
				<path d="M520 380 L580 440 L700 300" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round"/>`;
		case "server":
			return `<rect x="390" y="210" width="420" height="90" rx="14" fill="none" stroke="${accent}" stroke-width="8"/>
				<rect x="390" y="320" width="420" height="90" rx="14" fill="none" stroke="${accent}" stroke-width="8"/>
				<rect x="390" y="430" width="420" height="90" rx="14" fill="none" stroke="${accent}" stroke-width="8"/>
				<circle cx="450" cy="255" r="10" fill="${accent}"/><circle cx="450" cy="365" r="10" fill="${accent}"/><circle cx="450" cy="475" r="10" fill="${accent}"/>`;
		case "route":
			return `<circle cx="380" cy="240" r="28" fill="none" stroke="${accent}" stroke-width="8"/>
				<circle cx="820" cy="480" r="28" fill="none" stroke="${accent}" stroke-width="8"/>
				<path d="M408 250 C520 250 520 480 792 480" fill="none" stroke="${accent}" stroke-width="8"/>
				<path d="M408 250 C700 250 500 480 792 480" fill="none" stroke="${accent}" stroke-width="4" opacity="0.45"/>`;
		case "protocol":
			return `<text x="430" y="380" font-family="IBM Plex Mono, ui-monospace" font-size="72" fill="${accent}">JMAP</text>
				<text x="430" y="460" font-family="IBM Plex Mono, ui-monospace" font-size="36" fill="${accent}" opacity="0.55">IMAP SMTP</text>`;
		case "users":
			return `<circle cx="500" cy="280" r="70" fill="none" stroke="${accent}" stroke-width="8"/>
				<path d="M390 470 C390 390 610 390 610 470" fill="none" stroke="${accent}" stroke-width="8"/>
				<circle cx="700" cy="300" r="54" fill="none" stroke="${accent}" stroke-width="8" opacity="0.7"/>
				<path d="M620 470 C620 400 780 400 780 470" fill="none" stroke="${accent}" stroke-width="8" opacity="0.7"/>`;
		case "webhook":
			return `<circle cx="420" cy="330" r="36" fill="none" stroke="${accent}" stroke-width="8"/>
				<circle cx="780" cy="330" r="36" fill="none" stroke="${accent}" stroke-width="8"/>
				<path d="M456 330 H744" stroke="${accent}" stroke-width="8"/>
				<path d="M700 290 L744 330 L700 370" fill="none" stroke="${accent}" stroke-width="8"/>`;
		case "send":
			return `<path d="M340 420 L860 250 L700 500 L620 390 Z" fill="none" stroke="${accent}" stroke-width="10"/>`;
		case "host":
			return `<text x="600" y="360" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace" font-size="42" fill="${accent}">mail.codenak.com</text>
				<rect x="300" y="400" width="600" height="8" fill="${accent}" opacity="0.4"/>`;
		case "key":
			return `<circle cx="470" cy="330" r="80" fill="none" stroke="${accent}" stroke-width="10"/>
				<rect x="540" y="310" width="280" height="40" rx="8" fill="none" stroke="${accent}" stroke-width="10"/>
				<rect x="740" y="310" width="18" height="70" fill="${accent}"/>
				<rect x="780" y="310" width="18" height="54" fill="${accent}"/>`;
		case "spark":
			return `<path d="M600 160 L640 300 L790 330 L640 370 L600 520 L560 370 L410 330 L560 300 Z" fill="none" stroke="${accent}" stroke-width="10"/>`;
		case "move":
			return `<rect x="300" y="250" width="240" height="240" rx="20" fill="none" stroke="${accent}" stroke-width="8" opacity="0.5"/>
				<rect x="660" y="250" width="240" height="240" rx="20" fill="none" stroke="${accent}" stroke-width="8"/>
				<path d="M560 370 H640 M610 340 L640 370 L610 400" fill="none" stroke="${accent}" stroke-width="8"/>`;
		case "dns":
			return `<circle cx="600" cy="340" r="20" fill="${accent}"/>
				<circle cx="600" cy="340" r="90" fill="none" stroke="${accent}" stroke-width="4"/>
				<circle cx="600" cy="340" r="170" fill="none" stroke="${accent}" stroke-width="4" opacity="0.5"/>
				<circle cx="600" cy="340" r="250" fill="none" stroke="${accent}" stroke-width="4" opacity="0.25"/>`;
		case "paper":
			return `<rect x="420" y="180" width="280" height="360" rx="8" fill="none" stroke="${accent}" stroke-width="8"/>
				<path d="M470 280 H650 M470 330 H650 M470 380 H590" stroke="${accent}" stroke-width="8"/>
				<circle cx="760" cy="470" r="54" fill="none" stroke="${accent}" stroke-width="8"/>
				<path d="M760 430 V470 H790" fill="none" stroke="${accent}" stroke-width="8"/>`;
		case "lock":
			return `<rect x="430" y="300" width="340" height="220" rx="24" fill="none" stroke="${accent}" stroke-width="10"/>
				<path d="M500 300 V230 A100 100 0 0 1 700 230 V300" fill="none" stroke="${accent}" stroke-width="10"/>
				<circle cx="600" cy="410" r="18" fill="${accent}"/>`;
		case "disk":
			return `<rect x="360" y="230" width="480" height="280" rx="28" fill="none" stroke="${accent}" stroke-width="10"/>
				<rect x="400" y="270" width="400" height="28" rx="6" fill="${accent}" opacity="0.4"/>
				<rect x="400" y="320" width="280" height="28" rx="6" fill="${accent}" opacity="0.25"/>`;
		case "door":
			return `<rect x="430" y="160" width="340" height="420" rx="12" fill="none" stroke="${accent}" stroke-width="10"/>
				<circle cx="700" cy="380" r="14" fill="${accent}"/>`;
		case "inbox":
			return `<path d="M340 280 L600 480 L860 280" fill="none" stroke="${accent}" stroke-width="10"/>
				<path d="M380 500 H820 V360 L600 520 L380 360 Z" fill="none" stroke="${accent}" stroke-width="10"/>`;
		default:
			return `<text x="600" y="380" text-anchor="middle" font-family="Figtree, sans-serif" font-size="72" fill="${accent}" font-weight="600">Dispatch</text>
				<text x="600" y="440" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace" font-size="28" fill="${accent}" opacity="0.7">codenak.com</text>`;
	}
}

function titleFromSlug(slug) {
	return slug.replace(/-/g, " ");
}

const dir = resolve("public/blog");
mkdirSync(dir, { recursive: true });

for (const [slug, bg, accent, kind] of covers) {
	const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img">
  <rect width="1200" height="630" fill="${bg}"/>
  <rect x="48" y="48" width="1104" height="534" rx="28" fill="none" stroke="${accent}" stroke-opacity="0.18" stroke-width="2"/>
  ${motif(kind, accent)}
</svg>
`;
	writeFileSync(resolve(dir, `${slug}.svg`), svg);

	const inline = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" role="img">
  <rect width="1200" height="720" fill="${bg}"/>
  <rect x="40" y="40" width="1120" height="640" rx="32" fill="none" stroke="${accent}" stroke-opacity="0.22" stroke-width="2"/>
  <g transform="translate(0,40) scale(0.78)">${motif(kind, accent)}</g>
  <text x="80" y="640" font-family="Figtree, sans-serif" font-size="28" fill="${accent}">${titleFromSlug(slug)}</text>
</svg>
`;
	writeFileSync(resolve(dir, `${slug}-inline.svg`), inline);
	console.log(slug);
}
