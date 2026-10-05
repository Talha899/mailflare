import type { DnsAuthRecord, DnsRecord } from "./types";

export type DnsHostField = {
	label: string;
	value: string;
	/** False for instructional placeholders that should not pretend to be paste-ready. */
	copyable: boolean;
	hint?: string;
};

export type DnsHostInstruction = {
	type: string;
	title: string;
	fields: DnsHostField[];
	note?: string;
};

export function getDnsRecordLabel(record: DnsRecord): string {
	const recordName = record.name || "Domain";
	const destination = record.content ? ` → ${record.content}` : "";
	const priority = record.priority === undefined ? "" : ` (priority ${record.priority})`;
	return `${record.type || "DNS"} · ${recordName}${destination}${priority}`;
}

/** Cloudflare / most DNS panels want a relative host, with `@` for the apex. */
export function relativeDnsName(hostname: string, fqdn?: string): string {
	if (!fqdn?.trim()) return "@";
	const zone = hostname.toLowerCase().replace(/\.$/, "");
	const name = fqdn.trim().toLowerCase().replace(/\.$/, "");
	if (name === zone || name === "@") return "@";
	if (name.endsWith(`.${zone}`)) {
		const relative = name.slice(0, -(zone.length + 1));
		return relative || "@";
	}
	return fqdn.trim();
}

function parseMx(content: string, priority?: number): { priority: string; target: string } {
	const trimmed = (content ?? "").trim();
	const match = trimmed.match(/^(?:(\d+)\s+)?(\S.+)$/);
	return {
		priority: String(priority ?? (match?.[1] ? Number(match[1]) : 10)),
		target: (match?.[2] ?? trimmed).replace(/\.$/, "").trim(),
	};
}

function isPlaceholderContent(content?: string): boolean {
	const value = (content ?? "").trim();
	return !value || /^\(.*\)$/.test(value) || /paste\s+dkim/i.test(value) || /publish the /i.test(value);
}

/**
 * Turn an API checklist row into the Type / Name / Priority / Value a user
 * should type into Cloudflare DNS (or any panel with separate MX priority).
 */
export function toDnsHostInstruction(hostname: string, record: DnsRecord): DnsHostInstruction {
	const type = (record.type ?? "TXT").toUpperCase();
	const hostName = relativeDnsName(hostname, record.name);
	const content = record.content ?? "";

	if (type === "MX") {
		const mx = parseMx(content, record.priority);
		return {
			type: "MX",
			title: "MX — inbound mail",
			fields: [
				{ label: "Type", value: "MX", copyable: true },
				{ label: "Name", value: hostName, copyable: true, hint: "Use @ for the root domain in Cloudflare" },
				{ label: "Priority", value: mx.priority, copyable: true },
				{ label: "Mail server", value: mx.target, copyable: true, hint: "Do not include the priority number here" },
			],
			note: "Proxy status must be DNS only (gray cloud). TTL can stay Auto.",
		};
	}

	const placeholder = isPlaceholderContent(content);
	return {
		type,
		title: `${type} — ${hostName === "@" ? hostname : hostName}`,
		fields: [
			{ label: "Type", value: type, copyable: true },
			{ label: "Name", value: hostName, copyable: true },
			{
				label: "Content",
				value: content,
				copyable: !placeholder,
				hint: placeholder ? "Get this value from Cloudflare Email Sending after you onboard the domain" : undefined,
			},
		],
	};
}

export function recordsForAuthCheck(
	record: DnsAuthRecord,
	candidates: DnsRecord[],
	auditName?: string,
): DnsRecord[] {
	const lower = (value?: string) => (value ?? "").toLowerCase();
	const matched = candidates.filter((row) => {
		const type = lower(row.type);
		const name = lower(row.name);
		const content = lower(row.content);
		if (record === "mx") return type === "mx";
		if (record === "spf") {
			// Root SPF only — bounce SPF is listed under Email Sending extras.
			return (
				type === "txt" &&
				content.includes("v=spf1") &&
				!name.includes("_dmarc") &&
				!name.includes("_domainkey") &&
				!name.startsWith("cf-bounce.")
			);
		}
		if (record === "dkim") {
			return type === "txt" && name.includes("_domainkey");
		}
		if (record === "dmarc") {
			return type === "txt" && (name.includes("_dmarc") || content.includes("v=dmarc1"));
		}
		return false;
	});
	if (matched.length) return matched;
	if (auditName) {
		return [
			{
				type: record === "mx" ? "MX" : "TXT",
				name: auditName,
				content: `(publish the ${record.toUpperCase()} record for this name at your DNS host)`,
			},
		];
	}
	return [];
}

/** Cloudflare Email Sending also needs the cf-bounce SPF (not the root SPF check). */
export function bounceSpfRecords(candidates: DnsRecord[]): DnsRecord[] {
	return candidates.filter((row) => {
		const type = (row.type ?? "").toLowerCase();
		const name = (row.name ?? "").toLowerCase();
		const content = (row.content ?? "").toLowerCase();
		return type === "txt" && name.startsWith("cf-bounce.") && !name.includes("_domainkey") && content.includes("v=spf1");
	});
}

export async function copyText(value: string): Promise<boolean> {
	if (!value) return false;
	try {
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(value);
			return true;
		}
	} catch {
		/* fall through */
	}
	try {
		const textarea = document.createElement("textarea");
		textarea.value = value;
		textarea.setAttribute("readonly", "");
		textarea.style.position = "fixed";
		textarea.style.left = "-9999px";
		document.body.appendChild(textarea);
		textarea.select();
		const ok = document.execCommand("copy");
		document.body.removeChild(textarea);
		return ok;
	} catch {
		return false;
	}
}
