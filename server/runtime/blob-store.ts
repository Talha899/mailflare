import { join } from "node:path";
import { openFileBucket } from "./file-bucket";
import { S3Bucket, s3ConfigFromEnv } from "./s3-bucket";

export type BlobStoreHandle = {
	bucket: R2Bucket;
	kind: "local" | "s3";
	ensureReady?: () => Promise<void>;
};

/** Local files under DATA_DIR, or S3-compatible storage when S3_* env is set. */
export function openBlobStore(dataDir: string): BlobStoreHandle {
	const s3Config = s3ConfigFromEnv();
	if (s3Config) {
		const s3 = new S3Bucket(s3Config);
		return {
			bucket: s3 as unknown as R2Bucket,
			kind: "s3",
			ensureReady: () => s3.ensureBucket(),
		};
	}
	return { bucket: openFileBucket(join(dataDir, "blobs")), kind: "local" };
}
