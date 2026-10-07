import assert from "node:assert/strict";
import test from "node:test";
import { hasDkimPublicKey, parseOpenDkimPublicTxt } from "../src/lib/outbound/dkim-txt-utils.ts";

test("parseOpenDkimPublicTxt joins split quoted strings", () => {
	const raw = `mail._domainkey.example.com. IN TXT ( "v=DKIM1; h=sha256; k=rsa; p=ABC" "DEF" ) ;`;
	assert.equal(
		parseOpenDkimPublicTxt(raw),
		"v=DKIM1; h=sha256; k=rsa; p=ABCDEF",
	);
});

test("parseOpenDkimPublicTxt handles single-line boky layout", () => {
	const raw = `example.com. IN TXT "v=DKIM1; k=rsa; p=xyz"`;
	assert.equal(parseOpenDkimPublicTxt(raw), "v=DKIM1; k=rsa; p=xyz");
});

test("parseOpenDkimPublicTxt returns null for garbage", () => {
	assert.equal(parseOpenDkimPublicTxt(""), null);
	assert.equal(parseOpenDkimPublicTxt("hello"), null);
});

test("a DKIM stub without p= is not a public key", () => {
	assert.equal(hasDkimPublicKey("v=DKIM1; h=sha256; k=rsa; s=email;"), false);
	assert.equal(parseOpenDkimPublicTxt("v=DKIM1; h=sha256; k=rsa; s=email;"), null);
});
