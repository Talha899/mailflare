import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadBucketCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
	type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { s3BodyToBuffer } from "./s3-body";

type StoredHttpMeta = {
	contentType?: string;
	contentDisposition?: string;
	cacheControl?: string;
};

type StoredMeta = {
	httpMetadata?: StoredHttpMeta;
	customMetadata?: Record<string, string>;
	size: number;
	uploaded: string;
	etag: string;
};

export type S3BucketConfig = {
	endpoint: string;
	region: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
	forcePathStyle?: boolean;
	/** Optional prefix for all object keys (e.g. `mailflare` → `mailflare/inbound/...`). */
	keyPrefix?: string;
};

async function bodyToBuffer(
	value: ArrayBuffer | ArrayBufferView | string | ReadableStream | Blob | null,
): Promise<Buffer> {
	if (value === null) return Buffer.alloc(0);
	if (typeof value === "string") return Buffer.from(value);
	if (value instanceof ArrayBuffer) return Buffer.from(value);
	if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
	if (value instanceof Blob) return Buffer.from(await value.arrayBuffer());
	return Buffer.from(await new Response(value).arrayBuffer());
}

class S3Object {
	constructor(
		readonly key: string,
		private readonly meta: StoredMeta,
		private readonly bodyBuffer: Buffer | null,
	) {}

	get size() {
		return this.meta.size;
	}
	get etag() {
		return this.meta.etag;
	}
	get httpEtag() {
		return this.meta.etag.startsWith('"') ? this.meta.etag : `"${this.meta.etag}"`;
	}
	get uploaded() {
		return new Date(this.meta.uploaded);
	}
	get httpMetadata() {
		return this.meta.httpMetadata ?? {};
	}
	get customMetadata() {
		return this.meta.customMetadata ?? {};
	}
	get version() {
		return this.meta.etag;
	}
	get body(): ReadableStream<Uint8Array> {
		const buffer = this.bodyBuffer ?? Buffer.alloc(0);
		return new ReadableStream({
			start(controller) {
				controller.enqueue(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
				controller.close();
			},
		});
	}
	get bodyUsed() {
		return false;
	}
	async arrayBuffer(): Promise<ArrayBuffer> {
		if (!this.bodyBuffer) return new ArrayBuffer(0);
		return this.bodyBuffer.buffer.slice(
			this.bodyBuffer.byteOffset,
			this.bodyBuffer.byteOffset + this.bodyBuffer.byteLength,
		) as ArrayBuffer;
	}
	async text(): Promise<string> {
		return Buffer.from(await this.arrayBuffer()).toString("utf8");
	}
	async json<T>(): Promise<T> {
		return JSON.parse(await this.text()) as T;
	}
	async blob(): Promise<Blob> {
		return new Blob([await this.arrayBuffer()], { type: this.meta.httpMetadata?.contentType });
	}
	writeHttpMetadata(headers: Headers) {
		if (this.meta.httpMetadata?.contentType) headers.set("Content-Type", this.meta.httpMetadata.contentType);
		if (this.meta.httpMetadata?.contentDisposition) {
			headers.set("Content-Disposition", this.meta.httpMetadata.contentDisposition);
		}
		if (this.meta.httpMetadata?.cacheControl) headers.set("Cache-Control", this.meta.httpMetadata.cacheControl);
	}
}

function httpMetaFromOptions(
	options?: { httpMetadata?: StoredHttpMeta | Headers; customMetadata?: Record<string, string> },
): { contentType?: string; contentDisposition?: string; cacheControl?: string; metadata?: Record<string, string> } {
	const httpMetadata =
		options?.httpMetadata instanceof Headers
			? { contentType: options.httpMetadata.get("content-type") ?? undefined }
			: options?.httpMetadata;
	const metadata: Record<string, string> = {};
	if (options?.customMetadata) {
		for (const [key, value] of Object.entries(options.customMetadata)) {
			metadata[key.toLowerCase()] = value;
		}
	}
	return {
		contentType: httpMetadata?.contentType,
		contentDisposition: httpMetadata?.contentDisposition,
		cacheControl: httpMetadata?.cacheControl,
		metadata: Object.keys(metadata).length ? metadata : undefined,
	};
}

export class S3Bucket {
	private readonly client: S3Client;

	constructor(private readonly config: S3BucketConfig) {
		const clientConfig: S3ClientConfig = {
			region: config.region,
			endpoint: config.endpoint,
			credentials: {
				accessKeyId: config.accessKeyId,
				secretAccessKey: config.secretAccessKey,
			},
			forcePathStyle: config.forcePathStyle ?? false,
			// Amazon-only flexible checksums wrap GetObject in ChecksumStream and
			// break MinIO / Hostinger / custom endpoints. Keep CRC32 for S3 APIs.
			requestChecksumCalculation: "WHEN_REQUIRED",
			responseChecksumValidation: "WHEN_REQUIRED",
		};
		this.client = new S3Client(clientConfig);
	}

	private objectKey(key: string): string {
		const prefix = this.config.keyPrefix?.replace(/^\/+|\/+$/g, "") ?? "";
		if (!prefix) return key;
		return `${prefix}/${key.replace(/^\/+/, "")}`;
	}

	async ensureBucket(): Promise<void> {
		try {
			await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
		} catch {
			throw new Error(
				`S3 bucket "${this.config.bucket}" is missing or inaccessible at ${this.config.endpoint}. Create the bucket in your object storage panel first.`,
			);
		}
	}

	async get(key: string, options?: { range?: { offset?: number; length?: number; suffix?: number } }) {
		let range: string | undefined;
		if (options?.range) {
			if (options.range.suffix != null) {
				range = `bytes=-${options.range.suffix}`;
			} else if (options.range.offset != null || options.range.length != null) {
				const start = options.range.offset ?? 0;
				const end =
					options.range.length != null ? start + options.range.length - 1 : undefined;
				range = end != null ? `bytes=${start}-${end}` : `bytes=${start}-`;
			}
		}
		try {
			const response = await this.client.send(
				new GetObjectCommand({
					Bucket: this.config.bucket,
					Key: this.objectKey(key),
					Range: range,
				}),
			);
			const meta: StoredMeta = {
				size: response.ContentLength ?? 0,
				uploaded: (response.LastModified ?? new Date()).toISOString(),
				etag: (response.ETag ?? "").replace(/"/g, ""),
				httpMetadata: {
					contentType: response.ContentType,
					contentDisposition: response.ContentDisposition,
					cacheControl: response.CacheControl,
				},
				customMetadata: response.Metadata,
			};
			const buffer = await s3BodyToBuffer(response.Body ?? null);
			if (!meta.size) meta.size = buffer.byteLength;
			return new S3Object(key, meta, buffer);
		} catch (error) {
			const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
			if (name === "NoSuchKey" || name === "NotFound") return null;
			throw error;
		}
	}

	async head(key: string) {
		try {
			const response = await this.client.send(
				new HeadObjectCommand({
					Bucket: this.config.bucket,
					Key: this.objectKey(key),
				}),
			);
			return new S3Object(
				key,
				{
					size: response.ContentLength ?? 0,
					uploaded: (response.LastModified ?? new Date()).toISOString(),
					etag: (response.ETag ?? "").replace(/"/g, ""),
					httpMetadata: {
						contentType: response.ContentType,
						contentDisposition: response.ContentDisposition,
						cacheControl: response.CacheControl,
					},
					customMetadata: response.Metadata,
				},
				null,
			);
		} catch {
			return null;
		}
	}

	async put(
		key: string,
		value: ArrayBuffer | ArrayBufferView | string | ReadableStream | Blob | null,
		options?: { httpMetadata?: StoredHttpMeta | Headers; customMetadata?: Record<string, string> },
	) {
		const buffer = await bodyToBuffer(value);
		const { contentType, contentDisposition, cacheControl, metadata } = httpMetaFromOptions(options);
		const response = await this.client.send(
			new PutObjectCommand({
				Bucket: this.config.bucket,
				Key: this.objectKey(key),
				Body: buffer,
				ContentType: contentType,
				ContentDisposition: contentDisposition,
				CacheControl: cacheControl,
				Metadata: metadata,
			}),
		);
		const meta: StoredMeta = {
			size: buffer.byteLength,
			uploaded: new Date().toISOString(),
			etag: (response.ETag ?? "").replace(/"/g, ""),
			httpMetadata: { contentType, contentDisposition, cacheControl },
			customMetadata: metadata,
		};
		return new S3Object(key, meta, null);
	}

	async delete(keys: string | string[]) {
		const list = Array.isArray(keys) ? keys : [keys];
		await Promise.all(
			list.map((key) =>
				this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: this.objectKey(key) })),
			),
		);
	}

	async list(options?: { prefix?: string; cursor?: string; limit?: number }) {
		const prefix = options?.prefix ?? "";
		const response = await this.client.send(
			new ListObjectsV2Command({
				Bucket: this.config.bucket,
				Prefix: this.objectKey(prefix),
				ContinuationToken: options?.cursor,
				MaxKeys: options?.limit ?? 1000,
			}),
		);
		return {
			objects: (response.Contents ?? []).map((object) => {
				const key = this.appKey(object.Key ?? "");
				const etag = (object.ETag ?? "").replace(/"/g, "");
				return {
					key,
					version: etag,
					size: object.Size ?? 0,
					etag,
					httpEtag: etag ? `"${etag}"` : '""',
					uploaded: object.LastModified ?? new Date(),
					checksums: {},
					writeHttpMetadata() {},
				};
			}),
			truncated: Boolean(response.IsTruncated),
			cursor: response.NextContinuationToken,
			delimitedPrefixes: [] as string[],
		};
	}

	private appKey(storageKey: string): string {
		const prefix = this.config.keyPrefix?.replace(/^\/+|\/+$/g, "") ?? "";
		if (!prefix) return storageKey;
		const withSlash = `${prefix}/`;
		return storageKey.startsWith(withSlash) ? storageKey.slice(withSlash.length) : storageKey;
	}
}

export function s3ConfigFromEnv(): S3BucketConfig | null {
	const endpoint = firstEnv("S3_ENDPOINT", "STORAGE_ENDPOINT");
	const bucket = firstEnv("S3_BUCKET", "STORAGE_BUCKET");
	const accessKeyId = firstEnv("S3_ACCESS_KEY_ID", "STORAGE_ACCESS_KEY_ID");
	const secretAccessKey = firstEnv("S3_SECRET_ACCESS_KEY", "STORAGE_SECRET_ACCESS_KEY");
	if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
	return {
		endpoint,
		region: firstEnv("S3_REGION", "STORAGE_REGION") || "us-east-1",
		bucket,
		accessKeyId,
		secretAccessKey,
		forcePathStyle:
			firstEnv("S3_FORCE_PATH_STYLE", "STORAGE_FORCE_PATH_STYLE") === "true" ||
			firstEnv("S3_FORCE_PATH_STYLE", "STORAGE_FORCE_PATH_STYLE") === "1",
		keyPrefix: firstEnv("S3_KEY_PREFIX", "STORAGE_FOLDER", "STORAGE_KEY_PREFIX") || undefined,
	};
}

function firstEnv(...names: string[]): string | undefined {
	for (const name of names) {
		const value = process.env[name]?.trim();
		if (value) return value;
	}
}
