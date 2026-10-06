"use client";

import { getUserTimeZone } from "@/lib/time/utils";
import { clearUserTimeZonePreference } from "@/lib/time/client";
import type {
	AuthFetchOptions,
	AuthSessionChangedDetail,
	AuthSessionResponse,
} from "./client-types";

const SESSION_STORAGE_KEY = "mailflare-session-token";
export const AUTH_SESSION_CHANGED_EVENT = "mailflare:auth-session-changed";

function dispatchAuthSessionChanged(authenticated: boolean): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent<AuthSessionChangedDetail>(AUTH_SESSION_CHANGED_EVENT, {
			detail: { authenticated },
		}),
	);
}

/** A random per-sign-in id, not a credential: it only tells tabs a session exists or changed. */
const SESSION_MARKER_KEY = "mailflare-session-marker";

/**
 * The browser authenticates with the HttpOnly session cookie only. Earlier
 * builds kept the token in localStorage and sent it as a Bearer header, which
 * let any injected script read a 30-day credential and skipped the origin check
 * that guards cookie requests. That copy is discarded; a meaningless marker
 * takes over its other job of signalling "signed in / session changed".
 */
function readStorage(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeStorage(key: string, value: string | null): void {
	try {
		if (value === null) localStorage.removeItem(key);
		else localStorage.setItem(key, value);
	} catch {
		// Storage can be unavailable (private windows); realtime then falls back to polling.
	}
}

function newSessionMarker(): string {
	return typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** The session marker (never the session token); null when signed out. */
export function getClientSessionToken(): string | null {
	if (typeof window === "undefined") return null;
	if (readStorage(SESSION_STORAGE_KEY) !== null) {
		// Upgrade from a build that stored the real token: drop it, keep the session signal.
		writeStorage(SESSION_STORAGE_KEY, null);
		if (!readStorage(SESSION_MARKER_KEY)) writeStorage(SESSION_MARKER_KEY, newSessionMarker());
	}
	return readStorage(SESSION_MARKER_KEY);
}

/** Called after a sign-in response; the HttpOnly cookie it set is the actual session. */
export function setClientSessionToken(_token: string): void {
	writeStorage(SESSION_STORAGE_KEY, null);
	writeStorage(SESSION_MARKER_KEY, newSessionMarker());
	clearUserTimeZonePreference();
	dispatchAuthSessionChanged(true);
}

/** Mark the browser as signed in once the server has confirmed the cookie session. */
export function ensureClientSessionMarker(): void {
	if (typeof window === "undefined" || getClientSessionToken()) return;
	writeStorage(SESSION_MARKER_KEY, newSessionMarker());
	dispatchAuthSessionChanged(true);
}

export function clearClientSessionToken(): void {
	writeStorage(SESSION_STORAGE_KEY, null);
	writeStorage(SESSION_MARKER_KEY, null);
	clearUserTimeZonePreference();
	dispatchAuthSessionChanged(false);
}

export function getAuthHeaders(headers?: HeadersInit): Headers {
	const nextHeaders = new Headers(headers);
	if (typeof window !== "undefined" && !nextHeaders.has("X-Time-Zone")) {
		nextHeaders.set("X-Time-Zone", getUserTimeZone());
	}
	// No Authorization header: same-origin requests carry the HttpOnly cookie.
	return nextHeaders;
}

export async function authFetch(input: RequestInfo | URL, init: AuthFetchOptions = {}): Promise<Response> {
	const { redirectOnUnauthorized = true, headers, ...requestInit } = init;
	const response = await fetch(input, {
		...requestInit,
		headers: getAuthHeaders(headers),
	});

	if (response.status === 401 && redirectOnUnauthorized && typeof window !== "undefined") {
		clearClientSessionToken();
		window.location.assign("/login");
	}

	return response;
}

export async function persistAuthSession(response: Response): Promise<AuthSessionResponse> {
	const data = (await response.json()) as AuthSessionResponse;
	if (response.ok && data.token) setClientSessionToken(data.token);
	return data;
}
