import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { intakeIncomingMail } from "@/lib/email/intake";
import { verifyInboundSignature } from "@/lib/email/intake-signature";
import { inboundAttachmentLimitReasonFromRaw } from "@/lib/email/inbound-attachments";

export const dynamic = "force-dynamic";

/**
 * Signed inbound webhook (`INBOUND_WEBHOOK_SECRET`). Body is raw RFC 5322;
 * envelope addresses travel in headers. Response may request reject/forward.
 */
export async function POST(request: Request) {
	const env = getEnv();
	const secret = env.INBOUND_WEBHOOK_SECRET?.trim();
	if (!secret) return NextResponse.json({ error: "INBOUND_WEBHOOK_SECRET is not configured" }, { status: 503 });

	const raw = await request.arrayBuffer();
	if (raw.byteLength > 25 * 1024 * 1024) return NextResponse.json({ error: "Message exceeds the 25 MiB receiving limit" }, { status: 413 });
	const from = request.headers.get("x-mailflare-from") ?? "";
	const to = request.headers.get("x-mailflare-to") ?? "";
	const signature = request.headers.get("x-mailflare-signature") ?? "";
	if (!from || !to || !(await verifyInboundSignature(secret, signature, raw, from, to))) {
		return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
	}
	const attachmentLimitReason = await inboundAttachmentLimitReasonFromRaw(raw);
	if (attachmentLimitReason) return NextResponse.json({ action: "reject", reason: attachmentLimitReason });

	let headers: Record<string, string> = {};
	try {
		headers = JSON.parse(request.headers.get("x-mailflare-headers") ?? "{}") as Record<string, string>;
	} catch {
		// The header map is advisory; the raw message is authoritative.
	}

	let forwardTo: string | null = null;
	let forwardHeaders: Record<string, string> = {};
	const result = await intakeIncomingMail(
		env,
		{ from, to, raw, headers },
		{
			// The relay performs the forward on the live message; report it as done so keep-copy applies.
			forward: async (destination, extra) => {
				forwardTo = destination;
				forwardHeaders = extra;
				return true;
			},
		},
	);
	return NextResponse.json({ ...result, forwardTo, forwardHeaders });
}
