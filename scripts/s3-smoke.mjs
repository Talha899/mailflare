import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	HeadBucketCommand,
	GetObjectCommand,
	PutObjectCommand,
	DeleteObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";

function loadEnvFile(path) {
	if (!existsSync(path)) return;
	for (const line of readFileSync(path, "utf8").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq <= 0) continue;
		const key = trimmed.slice(0, eq).trim();
		const value = trimmed.slice(eq + 1).trim();
		if (!process.env[key]) process.env[key] = value;
	}
}

loadEnvFile(resolve(".env"));

function firstEnv(...names) {
	for (const name of names) {
		const value = process.env[name]?.trim();
		if (value) return value;
	}
}

const bucket = firstEnv("S3_BUCKET", "STORAGE_BUCKET");
const endpoint = firstEnv("S3_ENDPOINT", "STORAGE_ENDPOINT");
const accessKeyId = firstEnv("S3_ACCESS_KEY_ID", "STORAGE_ACCESS_KEY_ID");
const secretAccessKey = firstEnv("S3_SECRET_ACCESS_KEY", "STORAGE_SECRET_ACCESS_KEY");
if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
	console.error("Missing S3 env");
	process.exit(1);
}

const client = new S3Client({
	region: firstEnv("S3_REGION", "STORAGE_REGION") || "us-east-1",
	endpoint,
	credentials: { accessKeyId, secretAccessKey },
	forcePathStyle: firstEnv("S3_FORCE_PATH_STYLE", "STORAGE_FORCE_PATH_STYLE") === "true",
});

await client.send(new HeadBucketCommand({ Bucket: bucket }));

const prefix = (firstEnv("S3_KEY_PREFIX", "STORAGE_FOLDER") ?? "").replace(/^\/+|\/+$/g, "");
const key = prefix ? `${prefix}/_mailflare-smoke/${Date.now()}.txt` : `_mailflare-smoke/${Date.now()}.txt`;
await client.send(
	new PutObjectCommand({ Bucket: bucket, Key: key, Body: "mailflare s3 ok", ContentType: "text/plain" }),
);
const got = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
const text = await got.Body.transformToString();
await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
console.log(JSON.stringify({ bucket, endpoint, ok: text === "mailflare s3 ok" }, null, 2));
