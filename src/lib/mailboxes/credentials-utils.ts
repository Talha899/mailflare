import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

/** Cryptographically secure mailbox password (never log or persist plaintext). */
export function generateMailboxPassword(length = 20): string {
	const bytes = randomBytes(length);
	let out = "";
	for (let i = 0; i < length; i++) {
		out += PASSWORD_ALPHABET[bytes[i]! % PASSWORD_ALPHABET.length];
	}
	return out;
}

export function hashMailboxPassword(password: string): string {
	return hashPassword(password);
}

export function verifyMailboxPassword(password: string, hash: string): boolean {
	return verifyPassword(password, hash);
}
