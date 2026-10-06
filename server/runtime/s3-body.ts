/**
 * `@aws-sdk/client-s3` talks to any S3-compatible endpoint (Hostinger, MinIO,
 * s3.codenak.com). GetObject Body in Node is a Smithy stream (often named
 * ChecksumStream), not a Web ReadableStream. Readable.fromWeb() throws
 * ERR_INVALID_ARG_TYPE. Prefer transformToByteArray(); else iterate the stream.
 */
export async function s3BodyToBuffer(body: unknown): Promise<Buffer> {
	if (body == null) return Buffer.alloc(0);
	if (Buffer.isBuffer(body)) return body;
	if (body instanceof Uint8Array) return Buffer.from(body);
	if (body instanceof ArrayBuffer) return Buffer.from(body);
	if (ArrayBuffer.isView(body)) {
		return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
	}

	const stream = body as {
		transformToByteArray?: () => Promise<Uint8Array>;
		pipe?: unknown;
		getReader?: unknown;
	};
	if (typeof stream.transformToByteArray === "function") {
		return Buffer.from(await stream.transformToByteArray());
	}

	if (typeof stream.getReader === "function" && typeof stream.pipe !== "function") {
		return Buffer.from(await new Response(body as ReadableStream).arrayBuffer());
	}

	const iterable = body as AsyncIterable<Uint8Array | Buffer | string>;
	if (typeof stream.pipe === "function" || typeof iterable[Symbol.asyncIterator] === "function") {
		const chunks: Buffer[] = [];
		for await (const chunk of iterable) {
			chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
		}
		return chunks.length === 1 ? chunks[0]! : Buffer.concat(chunks);
	}

	throw new TypeError(`Unsupported object-store GetObject body: ${Object.prototype.toString.call(body)}`);
}
