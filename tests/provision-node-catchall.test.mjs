import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

function provisionSrc() {
	return read("src/lib/domains/provision.ts");
}

function stripComments(src) {
	return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

test("hasCloudflareCredentials always returns false", () => {
	const runtime = read("src/lib/runtime.ts");
	assert.match(
		runtime,
		/export function hasCloudflareCredentials[\s\S]*?\{\s*return false;\s*\}/,
		"hasCloudflareCredentials must always return false (no CF Email Routing API)",
	);
});

test("shouldBindEmailCatchAllToWorker always returns false", () => {
	const src = provisionSrc();
	assert.match(
		src,
		/export function shouldBindEmailCatchAllToWorker\s*\([^)]*\)[\s\S]*?\{\s*return false;\s*\}/,
		"catch-all Worker binding must be disabled when provisioning is always manual",
	);
});

test("provisionDomainOnCloudflare always uses MANUAL_ZONE_ID", () => {
	const src = stripComments(provisionSrc());
	assert.match(src, /export const MANUAL_ZONE_ID = "manual"/);
	assert.ok(
		!/from\s*"@\/lib\/cloudflare-api"/.test(src),
		"provision.ts must not import Cloudflare Email Routing API helpers",
	);
	assert.ok(
		!/ensureEmailRoutingCatchAllToWorker|enableEmailRouting|findZoneByHostname|createSendingSubdomain/.test(src),
		"provision.ts must not call Cloudflare zone / routing APIs",
	);
	assert.match(
		src,
		/zone:\s*\{\s*id:\s*MANUAL_ZONE_ID/,
		"provision result must record zone id MANUAL_ZONE_ID",
	);
	assert.match(
		src,
		/routingStatus:\s*"manual"/,
		"provision result must mark routing as manual",
	);
});

test("preflightDomain always returns manual mode", () => {
	const src = stripComments(read("src/lib/domains/preflight.ts"));
	assert.ok(
		!/from\s*"@\/lib\/cloudflare-api"/.test(src),
		"preflight must not look up Cloudflare zones",
	);
	assert.match(src, /mode:\s*"manual"/);
	assert.match(src, /MANUAL_ZONE_ID/);
});
