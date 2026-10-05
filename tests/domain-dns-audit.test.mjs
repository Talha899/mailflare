import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(join(tmpdir(), "mailflare-dns-audit-"));
after(() => rmSync(outDir, { recursive: true, force: true }));

await build({
	entryPoints: [join(root, "src/lib/domains/dns-audit.ts")],
	outfile: join(outDir, "dns-audit.mjs"),
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node22",
	logLevel: "silent",
	alias: { "@": join(root, "src") },
	external: ["dns", "node:dns", "node:dns/promises"],
});

const audit = await import(pathToFileURL(join(outDir, "dns-audit.mjs")).href);

const view = {
	routing: {
		records: [],
		missing: [{ type: "MX", name: "codenak.com", content: "10 mail.aiorders.io" }],
	},
	sending: [
		{ type: "TXT", name: "codenak.com", content: "v=spf1 a:mail.aiorders.io ~all" },
		{ type: "TXT", name: "_dmarc.codenak.com", content: "v=DMARC1; p=none" },
	],
	dkimSelector: "mail",
};

test("expected MX hosts come from checklist", () => {
	assert.deepEqual(audit.expectedMxHosts(view), ["mail.aiorders.io"]);
});

test("Hostinger MX does not satisfy Mailflare MX", () => {
	assert.equal(audit.mxAnswerMatchesExpected("10 mx2.hostinger.com.", ["mail.aiorders.io"]), false);
	assert.equal(audit.mxAnswerMatchesExpected("10 mail.aiorders.io", ["mail.aiorders.io"]), true);
	assert.equal(audit.mxAnswerMatchesExpected("mail.aiorders.io.", ["mail.aiorders.io"]), true);
});

test("Hostinger SPF does not satisfy Mailflare SPF", () => {
	const needles = audit.expectedSpfNeedles(view);
	assert.ok(needles.includes("a:mail.aiorders.io"));
	assert.equal(
		audit.spfAnswerMatchesExpected("v=spf1 include:_spf.mail.hostinger.com ~all", needles),
		false,
	);
	assert.equal(audit.spfAnswerMatchesExpected("v=spf1 a:mail.aiorders.io ~all", needles), true);
});
