import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Open a shared MongoDB client for SaaS tenant metadata (orgs, domain
 * verification, plan limits). Mail data stays in SQLite.
 */
export async function openMongoClient(url: string): Promise<Db> {
	if (db) return db;
	client = new MongoClient(url);
	await client.connect();
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
