import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(join(tmpdir(), "mailflare-domain-dns-"));
after(() => rmSync(outDir, { recursive: true, force: true }));

await build({
	entryPoints: [join(root, "src/app/(admin)/admin/(console)/domains/domain-dns-details-utils.ts")],
	outfile: join(outDir, "dns-utils.mjs"),
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node22",
	logLevel: "silent",
	alias: { "@": join(root, "src") },
});

const utils = await import(pathToFileURL(join(outDir, "dns-utils.mjs")).href);

const hostname = "healudoc.com";
const checklist = [
	{ type: "MX", name: "healudoc.com", content: "10 mail.aiorders.io" },
	{ type: "TXT", name: "healudoc.com", content: "v=spf1 include:_spf.mx.cloudflare.net a:mail.aiorders.io ~all" },
	{ type: "TXT", name: "_dmarc.healudoc.com", content: "v=DMARC1; p=none" },
	{ type: "TXT", name: "cf-bounce.healudoc.com", content: "v=spf1 include:_spf.mx.cloudflare.net ~all" },
	{
		type: "TXT",
		name: "cf-bounce._domainkey.healudoc.com",
		content: "(paste DKIM value from Cloudflare Email Sending → Settings after onboarding this domain)",
	},
];

test("relativeDnsName maps FQDNs to Cloudflare host names", () => {
	assert.equal(utils.relativeDnsName(hostname, "healudoc.com"), "@");
	assert.equal(utils.relativeDnsName(hostname, "_dmarc.healudoc.com"), "_dmarc");
	assert.equal(utils.relativeDnsName(hostname, "cf-bounce.healudoc.com"), "cf-bounce");
	assert.equal(utils.relativeDnsName(hostname, "cf-bounce._domainkey.healudoc.com"), "cf-bounce._domainkey");
});

test("MX instruction splits priority and mail server for copy", () => {
	const mx = utils.toDnsHostInstruction(hostname, checklist[0]);
	const byLabel = Object.fromEntries(mx.fields.map((field) => [field.label, field]));
	assert.equal(byLabel.Name.value, "@");
	assert.equal(byLabel.Priority.value, "10");
	assert.equal(byLabel["Mail server"].value, "mail.aiorders.io");
	assert.equal(byLabel.Name.copyable, true);
	assert.equal(byLabel["Mail server"].copyable, true);
});

test("TXT instruction uses relative names and blocks DKIM placeholder copy", () => {
	const spf = utils.toDnsHostInstruction(hostname, checklist[1]);
	assert.equal(spf.fields.find((f) => f.label === "Name").value, "@");
	assert.equal(spf.fields.find((f) => f.label === "Content").copyable, true);

	const dmarc = utils.toDnsHostInstruction(hostname, checklist[2]);
	assert.equal(dmarc.fields.find((f) => f.label === "Name").value, "_dmarc");

	const dkim = utils.toDnsHostInstruction(hostname, checklist[4]);
	assert.equal(dkim.fields.find((f) => f.label === "Name").value, "cf-bounce._domainkey");
	assert.equal(dkim.fields.find((f) => f.label === "Content").copyable, false);
});

test("auth grouping keeps root SPF separate from bounce SPF", () => {
	const spf = utils.recordsForAuthCheck("spf", checklist);
	assert.equal(spf.length, 1);
	assert.equal(spf[0].name, "healudoc.com");

	const bounce = utils.bounceSpfRecords(checklist);
	assert.equal(bounce.length, 1);
	assert.equal(bounce[0].name, "cf-bounce.healudoc.com");

	const mx = utils.recordsForAuthCheck("mx", checklist);
	assert.equal(mx[0].content, "10 mail.aiorders.io");
});
