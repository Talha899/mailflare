#!/usr/bin/env node
/**
 * Smoke checks for Docker/Node production deploys. Loads .env when present.
 * Usage: node scripts/prod-readiness.mjs [baseUrl]
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const name of [".env"]) {
	const envPath = resolve(root, name);
	if (!existsSync(envPath)) continue;
	for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
	}
}

const base = (process.argv[2] ?? process.env.APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const warnings = [];
const errors = [];

function warn(msg) {
	warnings.push(msg);
}
function fail(msg) {
	errors.push(msg);
}

async function checkHttp() {
	const url = `${base}/api/setup/status`;
	let res;
	try {
		res = await fetch(url);
	} catch (e) {
		fail(`Cannot reach ${url}: ${e.message}`);
		return;
	}
	if (!res.ok) {
		fail(`GET ${url} returned ${res.status}`);
		return;
	}
	const body = await res.json();
	console.log("setup/status:", JSON.stringify(body, null, 2));
	if (body.saasMode && !process.env.MONGO_URL?.trim()) {
		warn("saasMode is true but MONGO_URL is unset in this shell (compose may still set it in-container).");
	}
	const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "";
	if (!appUrl || appUrl.includes("localhost") || appUrl.includes("127.0.0.1")) {
		warn("Set APP_URL to your public HTTPS origin before go-live (password reset links, webhooks).");
	}
	if (!process.env.MAIL_HOSTNAME?.trim() || process.env.MAIL_HOSTNAME === "localhost") {
		warn("Set MAIL_HOSTNAME to the hostname MX records should point at.");
	}
	if (!process.env.CF_TOKEN?.trim() || !process.env.CF_ACCOUNT_ID?.trim()) {
		warn("CF_TOKEN + CF_ACCOUNT_ID unset — outbound may fail unless SMTP_URL is set.");
	}
	if (process.env.S3_ENDPOINT?.trim() || process.env.STORAGE_ENDPOINT?.trim()) {
		if (
			!(process.env.S3_BUCKET?.trim() || process.env.STORAGE_BUCKET?.trim()) ||
			!(process.env.S3_ACCESS_KEY_ID?.trim() || process.env.STORAGE_ACCESS_KEY_ID?.trim())
		) {
			fail("S3/STORAGE endpoint is set but bucket or access key is missing.");
		} else {
			try {
				const { spawnSync } = await import("node:child_process");
				const r = spawnSync(process.execPath, ["scripts/s3-smoke.mjs"], {
					cwd: root,
					encoding: "utf8",
					env: process.env,
				});
				if (r.status !== 0) fail(`S3 smoke failed:\n${r.stdout}\n${r.stderr}`);
				else console.log("S3 smoke: ok");
			} catch (e) {
				warn(`S3 smoke skipped: ${e.message}`);
			}
		}
	}
}

async function checkMongo() {
	let mongoUrl = process.env.MONGO_URL?.trim();
	if (!mongoUrl) return;
	if (mongoUrl.includes("mongodb://mongo:")) {
		mongoUrl = mongoUrl.replace("mongodb://mongo:", "mongodb://127.0.0.1:");
		warn("MONGO_URL uses Docker hostname mongo; checking 127.0.0.1 for host-side smoke.");
	}
	try {
		const { spawnSync } = await import("node:child_process");
		const r = spawnSync(process.execPath, ["scripts/mongo-health.mjs"], {
			cwd: root,
			encoding: "utf8",
			env: { ...process.env, MONGO_URL: mongoUrl },
		});
		if (r.status !== 0) fail(`Mongo health failed:\n${r.stdout}\n${r.stderr}`);
		else console.log("Mongo: ok");
	} catch (e) {
		fail(`Mongo check error: ${e.message}`);
	}
}

await checkHttp();
await checkMongo();

console.log("");
for (const w of warnings) console.log("WARN:", w);
for (const e of errors) console.log("FAIL:", e);

if (errors.length) process.exit(1);
console.log(errors.length === 0 && warnings.length === 0 ? "All checks passed." : "Passed with warnings.");
