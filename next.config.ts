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
