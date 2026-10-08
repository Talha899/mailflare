import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const directory = mkdtempSync(join(root, "node_modules", "mailflare-admin-auth-test-"));
after(() => rmSync(directory, { recursive: true, force: true }));

await build({
	stdin: {
		contents: `
			export { canManageApplicationUpdate, isInstanceOwner, isPrimaryAdmin } from "./src/lib/auth/admin.ts";
			export { isNodeRuntime } from "./src/lib/runtime.ts";
		`,
		resolveDir: root,
		sourcefile: "admin-auth-test-entry.ts",
	},
	outfile: join(directory, "entry.mjs"),
	bundle: true,
	format: "esm",
	platform: "node",
	target: "node24",
	tsconfig: join(root, "tsconfig.json"),
	logLevel: "silent",
});

const { canManageApplicationUpdate, isInstanceOwner, isPrimaryAdmin, isNodeRuntime } = await import(
	pathToFileURL(join(directory, "entry.mjs")).href,
);

const saasPrimary = {
	role: "admin",
	isPrimaryAdmin: true,
	organizationId: "org_acme",
};
const operatorPrimary = {
	role: "admin",
	isPrimaryAdmin: true,
	organizationId: "org_default",
};
const staffAdmin = {
	role: "admin",
	isPrimaryAdmin: false,
	organizationId: "org_acme",
};

test("primary admin is not instance owner on Cloudflare SaaS unless they run org_default", (t) => {
	const previous = globalThis.__mailflareNodeEnv;
	globalThis.__mailflareNodeEnv = { MAILFLARE_RUNTIME: "node" };
	t.after(() => {
		globalThis.__mailflareNodeEnv = previous;
	});

	const cloudflareSaas = { SAAS_MODE: "true" };
	assert.equal(isNodeRuntime(cloudflareSaas), false);
	assert.equal(isInstanceOwner(cloudflareSaas, saasPrimary), false);
	assert.equal(isInstanceOwner(cloudflareSaas, operatorPrimary), true);
	assert.equal(canManageApplicationUpdate(cloudflareSaas, saasPrimary), false);
	assert.equal(canManageApplicationUpdate(cloudflareSaas, operatorPrimary), true);
});

test("Coolify Node SaaS treats the tenant primary admin as install owner", () => {
	const nodeSaas = { SAAS_MODE: "true", MAILFLARE_RUNTIME: "node" };
	assert.equal(isPrimaryAdmin(saasPrimary), true);
	assert.equal(isInstanceOwner(nodeSaas, saasPrimary), true);
	assert.equal(canManageApplicationUpdate(nodeSaas, saasPrimary), true);
	assert.equal(isInstanceOwner(nodeSaas, staffAdmin), false);
	assert.equal(canManageApplicationUpdate(nodeSaas, staffAdmin), false);
});

test("single-tenant primary admin remains the instance owner", () => {
	assert.equal(isInstanceOwner({ SAAS_MODE: "false" }, saasPrimary), true);
});

test("webmail sessions and staff admins cannot manage application updates", () => {
	const nodeSaas = { SAAS_MODE: "true", MAILFLARE_RUNTIME: "node" };
	const mailboxSession = {
		role: "user",
		isPrimaryAdmin: false,
		organizationId: "org_acme",
	};
	assert.equal(canManageApplicationUpdate(nodeSaas, mailboxSession), false);
	assert.equal(isInstanceOwner(nodeSaas, mailboxSession), false);
	assert.equal(isNodeRuntime(nodeSaas), true);
});
