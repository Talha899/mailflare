import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(join(tmpdir(), "mailflare-security-"));
after(() => rmSync(outDir, { recursive: true, force: true }));

async function load(entry, name) {
	await build({
		entryPoints: [join(root, entry)],
		outfile: join(outDir, `${name}.mjs`),
		bundle: true,
		platform: "node",
		format: "esm",
		target: "node22",
		logLevel: "silent",
		alias: { "@": join(root, "src") },
	});
	return import(pathToFileURL(join(outDir, `${name}.mjs`)).href);
}

const publicUrl = await load("src/lib/http/public-url.ts", "public-url");
const clientIp = await load("server/runtime/client-ip.ts", "client-ip");
const sessionScope = await load("src/lib/mailboxes/access.ts", "access");

test("webhook URLs must be public http(s) addresses", () => {
	for (const url of [
		"http://127.0.0.1:6379/",
		"http://localhost/hook",
		"http://169.254.169.254/latest/meta-data/",
		"http://10.0.0.5/",
		"http://172.20.1.1/",
		"http://192.168.1.10/",
		"http://[::1]/",
		"http://[fd00::1]/",
		"http://redis.internal/",
		"https://user:pass@example.com/",
		"ftp://example.com/",
		"not a url",
	]) {
		assert.ok(publicUrl.getPublicUrlProblem(url), `${url} should be refused`);
	}
	for (const url of ["https://hooks.example.com/mail", "http://203.0.113.10:8080/in"]) {
		assert.equal(publicUrl.getPublicUrlProblem(url), null, `${url} should be allowed`);
	}
});

test("private address ranges are recognised", () => {
	assert.equal(publicUrl.isPrivateAddress("100.64.0.1"), true);
	assert.equal(publicUrl.isPrivateAddress("::ffff:127.0.0.1"), true);
	assert.equal(publicUrl.isPrivateAddress("8.8.8.8"), false);
	assert.equal(publicUrl.isPrivateAddress("2606:4700::1111"), false);
});

function fakeRequest(headers, remoteAddress = "198.51.100.7") {
	return { headers, socket: { remoteAddress } };
}

test("client IP ignores a spoofed cf-connecting-ip unless trusted", () => {
	delete process.env.TRUSTED_CLIENT_IP_HEADER;
	delete process.env.TRUST_PROXY_HOPS;
	const request = fakeRequest({ "cf-connecting-ip": "1.2.3.4" });
	assert.equal(clientIp.resolveClientIp(request), "198.51.100.7");
	clientIp.applyTrustedClientIp(request);
	assert.equal(request.headers["cf-connecting-ip"], "198.51.100.7");

	process.env.TRUSTED_CLIENT_IP_HEADER = "cf-connecting-ip";
	assert.equal(clientIp.resolveClientIp(fakeRequest({ "cf-connecting-ip": "1.2.3.4" })), "1.2.3.4");
	delete process.env.TRUSTED_CLIENT_IP_HEADER;
});

test("client IP takes the proxy-appended X-Forwarded-For entry, not the client's", () => {
	process.env.TRUST_PROXY_HOPS = "1";
	const request = fakeRequest({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }, "10.0.0.2");
	assert.equal(clientIp.resolveClientIp(request), "203.0.113.9");
	delete process.env.TRUST_PROXY_HOPS;
});

test("websocket origin must match the host", () => {
	assert.equal(clientIp.isSameHostWebSocketOrigin("https://mail.example.com", "mail.example.com"), true);
	assert.equal(clientIp.isSameHostWebSocketOrigin("https://evil.example.com", "mail.example.com"), false);
	assert.equal(clientIp.isSameHostWebSocketOrigin(undefined, "mail.example.com"), false);
});

test("a webmail session reaches only the mailbox it signed in with", () => {
	assert.equal(sessionScope.ownedMailboxAllowed({ sessionMailboxId: "mbx_a" }, "mbx_a"), true);
	assert.equal(sessionScope.ownedMailboxAllowed({ sessionMailboxId: "mbx_a" }, "mbx_b"), false);
	assert.equal(sessionScope.ownedMailboxAllowed({ sessionMailboxId: null }, "mbx_b"), true);
	assert.equal(sessionScope.ownedMailboxAllowed({}, "mbx_b"), true);
});
