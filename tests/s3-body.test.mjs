import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { s3BodyToBuffer } from "../server/runtime/s3-body.ts";

class ChecksumStream extends Readable {
	constructor(payload) {
		super();
		this.payload = payload;
	}
	_read() {
		this.push(this.payload);
		this.push(null);
	}
}

test("Readable.fromWeb rejects a Node ChecksumStream", () => {
	const stream = new ChecksumStream(Buffer.from("hello"));
	assert.throws(() => Readable.fromWeb(stream), { code: "ERR_INVALID_ARG_TYPE" });
});

test("s3BodyToBuffer reads AWS SDK transformToByteArray bodies", async () => {
	const body = {
		async transformToByteArray() {
			return new TextEncoder().encode("from-sdk");
		},
	};
	assert.equal((await s3BodyToBuffer(body)).toString(), "from-sdk");
});

test("s3BodyToBuffer reads a Node ChecksumStream", async () => {
	const stream = new ChecksumStream(Buffer.from("inbound-mime"));
	assert.equal((await s3BodyToBuffer(stream)).toString(), "inbound-mime");
});

test("s3BodyToBuffer reads a Web ReadableStream", async () => {
	const body = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode("web-body"));
			controller.close();
		},
	});
	assert.equal((await s3BodyToBuffer(body)).toString(), "web-body");
});
