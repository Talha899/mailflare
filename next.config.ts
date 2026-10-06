import type { NextConfig } from "next";
import { getSecurityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
	// MAILFLARE_DIST_DIR lets a second dev server (e.g. an isolated test instance) run beside the usual one.
	distDir: process.env.MAILFLARE_DIST_DIR || (process.env.MAILFLARE_RUNTIME === "node" ? ".next-node" : undefined),
	turbopack: {
		root: import.meta.dirname,
		resolveAlias: process.env.MAILFLARE_RUNTIME === "node" ? {
			"cloudflare:workers": "./server/runtime/cloudflare-workers.ts",
		} : {},
	},
  allowedDevOrigins: ["mail.dev", "127.0.0.1", "localhost"],
	typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete
    // even if your project has type errors.
    ignoreBuildErrors: true,
	  },
	// Native and server-only packages used by the self-hosted runtime; never bundle them.
	serverExternalPackages: ["better-sqlite3", "nodemailer", "smtp-server", "ws"],
	// The admin console moved under /admin so it can never be confused with mail
	// routes; old bookmarks keep working. /agent alone moves: /agent/review/* is mail.
	async redirects() {
		const moved = ["mailboxes", "domains", "accounts", "routing", "webhooks", "api-keys", "general", "backups", "branding", "licenses", "activity", "audit-logs", "ai-usage"];
		return [
			...moved.flatMap((segment) => [
				{ source: `/${segment}`, destination: `/admin/${segment}`, permanent: true },
				{ source: `/${segment}/:path*`, destination: `/admin/${segment}/:path*`, permanent: true },
			]),
			{ source: "/agent", destination: "/admin/agent", permanent: true },
			// Organization signup belongs to the admin portal, not webmail.
			{ source: "/signup", destination: "/admin/signup", permanent: true },
		];
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: getSecurityHeaders(),
			},
		];
	},
};

export default nextConfig;
