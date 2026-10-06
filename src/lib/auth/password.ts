import bcrypt from "bcryptjs";

const COST = 12;
/** A valid cost-12 hash of a random string, compared against when an account does not exist. */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5W1bbx8FGkBXrONd1QWfQ5wXyvqW9hO";

export function hashPassword(password: string): string {
	return bcrypt.hashSync(password, COST);
}

export function verifyPassword(password: string, hash: string): boolean {
	return bcrypt.compareSync(password, hash);
}

/**
 * Non-blocking compare for sign-in paths. bcryptjs's async variant yields to the
 * event loop between rounds, so a burst of IMAP/SMTP/web logins cannot stall the
 * single Node process that also serves the app.
 */
export async function verifyPasswordAsync(password: string, hash: string): Promise<boolean> {
	try {
		return await bcrypt.compare(password, hash);
	} catch {
		return false;
	}
}

/** Spend the same time as a real check, so response timing does not reveal which accounts exist. */
export async function burnPasswordCheck(password: string): Promise<false> {
	await verifyPasswordAsync(password, DUMMY_HASH);
	return false;
}
