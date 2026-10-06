import { normalizeMailHostname } from "@/lib/domains/hostname";

export type ProtocolEndpoint = {
	host: string;
	port: number;
	encryption: "STARTTLS" | "SSL/TLS" | "none";
	configured: boolean;
};

export type MailboxConnectionInfo = {
	username: string;
	smtp: ProtocolEndpoint;
	imap: ProtocolEndpoint;
	note: string | null;
};

function mailHost(): string {
	return (
		normalizeMailHostname(process.env.MAIL_HOSTNAME?.trim() || process.env.APP_URL?.trim() || "") ||
		""
	);
}

function envPort(name: string, fallback: number): number {
	const raw = process.env[name]?.trim();
	if (!raw) return fallback;
	const n = Number(raw);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

function tlsConfigured(): boolean {
	return Boolean(process.env.SMTP_TLS_KEY?.trim() && process.env.SMTP_TLS_CERT?.trim());
}

/**
 * Real connection details for clients. Host comes from MAIL_HOSTNAME.
 * Protocol servers only run on the Node runtime — configured=false when ports are disabled.
 * Encryption reflects what the Node listeners actually support (plain / implicit TLS).
 * STARTTLS is not implemented on IMAP 143 or SMTP 587 yet.
 */
export function getMailboxConnectionInfo(address: string): MailboxConnectionInfo {
	const host = mailHost();
	const smtpPort = envPort("SMTP_SUBMISSION_PORT", 587);
	const imapPort = envPort("IMAP_PORT", 143);
	const imapsPort = envPort("IMAPS_PORT", 993);
	const smtpTlsPort = envPort("SMTP_SUBMISSION_TLS_PORT", 465);
	const hasTls = tlsConfigured();

	const useImaps = hasTls && Boolean(process.env.IMAPS_PORT?.trim()) && Number(process.env.IMAPS_PORT) > 0;
	const useSmtps =
		hasTls &&
		Boolean(process.env.SMTP_SUBMISSION_TLS_PORT?.trim()) &&
		Number(process.env.SMTP_SUBMISSION_TLS_PORT) > 0;

	const smtpConfigured = Boolean(host) && (useSmtps ? smtpTlsPort > 0 : smtpPort > 0);
	const imapConfigured = Boolean(host) && (useImaps ? imapsPort > 0 : imapPort > 0);

	return {
		username: address.toLowerCase(),
		smtp: {
			host: host || "(set MAIL_HOSTNAME)",
			port: useSmtps ? smtpTlsPort : smtpPort,
			encryption: useSmtps ? "SSL/TLS" : "none",
			configured: smtpConfigured,
		},
		imap: {
			host: host || "(set MAIL_HOSTNAME)",
			port: useImaps ? imapsPort : imapPort,
			encryption: useImaps ? "SSL/TLS" : "none",
			configured: imapConfigured,
		},
		note: host
			? useImaps || useSmtps
				? null
				: "TLS certificates are unset — clients should connect without encryption (or enable IMAPS/SMTPS with SMTP_TLS_KEY/CERT)."
			: "MAIL_HOSTNAME is unset — publish DNS and set the mail host before giving clients these settings.",
	};
}
