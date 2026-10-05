/**
 * Smoke-check Mongo connectivity. Usage:
 *   MONGO_URL=mongodb://127.0.0.1:27017/mailflare node scripts/mongo-health.mjs
 */
import { MongoClient } from "mongodb";

const url = process.env.MONGO_URL?.trim();
if (!url) {
	console.error("MONGO_URL is not set");
	process.exit(1);
}

const client = new MongoClient(url);
try {
	await client.connect();
	const result = await client.db().command({ ping: 1 });
	if (result?.ok !== 1) throw new Error("ping failed");
	console.log("MongoDB healthy:", url.replace(/\/\/.*@/, "//***@"));
	process.exit(0);
} catch (error) {
	console.error("MongoDB health check failed:", error instanceof Error ? error.message : error);
	process.exit(1);
} finally {
	await client.close().catch(() => {});
}
