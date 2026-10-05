import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	HeadBucketCommand,
	GetObjectCommand,
	PutObjectCommand,
	DeleteObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";

function loadEnvFile(path) {
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

loadEnvFile(resolve(".env.docker"));

const bucket = process.env.S3_BUCKET?.trim();
const endpoint = process.env.S3_ENDPOINT?.trim();
const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
	console.error("Missing S3 env");
	process.exit(1);
}

const client = new S3Client({
	region: process.env.S3_REGION?.trim() || "us-east-1",
	endpoint,
	credentials: { accessKeyId, secretAccessKey },
	forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
});

await client.send(new HeadBucketCommand({ Bucket: bucket }));

const prefix = process.env.S3_KEY_PREFIX?.trim().replace(/^\/+|\/+$/g, "") ?? "";
const key = prefix ? `${prefix}/_mailflare-smoke/${Date.now()}.txt` : `_mailflare-smoke/${Date.now()}.txt`;
await client.send(
	new PutObjectCommand({ Bucket: bucket, Key: key, Body: "mailflare s3 ok", ContentType: "text/plain" }),
);
const got = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
const text = await got.Body.transformToString();
await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
console.log(JSON.stringify({ bucket, endpoint, ok: text === "mailflare s3 ok" }, null, 2));
