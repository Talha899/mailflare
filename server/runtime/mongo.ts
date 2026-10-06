import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

function mongoHostname(url: string): string {
	try {
		return new URL(url.replace(/^mongodb(\+srv)?:/i, "https:")).hostname;
	} catch {
		return "(invalid MONGO_URL)";
	}
}

/**
 * Open a shared MongoDB client for SaaS tenant metadata (orgs, domain
 * verification, plan limits). Mail data stays in SQLite.
 */
export async function openMongoClient(url: string): Promise<Db> {
	if (db) return db;
	client = new MongoClient(url, {
		serverSelectionTimeoutMS: 8000,
		connectTimeoutMS: 8000,
	});
	try {
		await client.connect();
	} catch (error) {
		await client.close().catch(() => undefined);
		client = null;
		const host = mongoHostname(url);
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(
			`MongoDB unreachable at host "${host}". ${detail}. ` +
				`If this is a Coolify database, MONGO_URL must use a hostname on the coolify Docker network (or the host IP with authSource=admin).`,
		);
	}
	db = client.db();
	return db;
}

export function getMongoDb(): Db | null {
	return db;
}

export async function closeMongoClient(): Promise<void> {
	if (client) {
		await client.close();
		client = null;
		db = null;
	}
}
