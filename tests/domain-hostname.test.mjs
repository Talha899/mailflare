import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(join(tmpdir(), "mailflare-hostname-"));
after(() => rmSync(outDir, { recursive: true, force: true }));

await build({
	entryPoints: [join(root, "src/lib/domains/hostname.ts")],
	outfile: join(outDir, "hostname.mjs"),
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node22",
	logLevel: "silent",
	alias: { "@": join(root, "src") },
});

const hostname = await import(pathToFileURL(join(outDir, "hostname.mjs")).href);

test("normalizeDomainHostname strips URLs and paths", () => {
	assert.equal(hostname.normalizeDomainHostname("https://codenak.com/"), "codenak.com");
	assert.equal(hostname.normalizeDomainHostname("http://CODENAK.COM"), "codenak.com");
	assert.equal(hostname.normalizeDomainHostname("codenak.com."), "codenak.com");
	assert.equal(hostname.normalizeDomainHostname("  Example.COM  "), "example.com");
});

test("assertDomainHostname rejects URLs that do not resolve to a domain", () => {
	assert.equal(hostname.assertDomainHostname("https://codenak.com/path"), "codenak.com");
	assert.throws(() => hostname.assertDomainHostname("not a domain"), /domain name/);
	assert.throws(() => hostname.assertDomainHostname(""), /domain name/);
});

test("normalizeMailHostname collapses mail.mail doubling", () => {
	assert.equal(hostname.normalizeMailHostname("mail.mail.aiorders.io"), "mail.aiorders.io");
	assert.equal(hostname.normalizeMailHostname("https://mail.aiorders.io/"), "mail.aiorders.io");
	assert.equal(hostname.normalizeMailHostname("mail.aiorders.io"), "mail.aiorders.io");
});
