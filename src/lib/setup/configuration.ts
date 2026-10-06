import { isNodeRuntime } from "@/lib/runtime";
import type { SetupRequirementCheck } from "./types";

export function getSetupRequirementChecks(env: CloudflareEnv): SetupRequirementCheck[] {
	const mailer = env.EMAIL as unknown as { configured?: boolean };
	return [
		{
			key: "Database",
			configured: !!env.DB,
			message: isNodeRuntime(env)
				? "DATA_DIR must be writable; the SQLite database is created there on start."
				: "Database binding is required.",
		},
		{
			key: "Outbound mail",
			configured: mailer?.configured === true,
			message: "Set SMTP_URL (e.g. smtp://postfix:587). Receiving works without it.",
		},
		{
			key: "Domain DNS",
			configured: true,
			message: "Add MX, SPF, and DKIM records for each domain by hand, as shown on the domain page.",
		},
	];
}
