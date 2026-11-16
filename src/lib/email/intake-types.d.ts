export type IntakeInput = {
	/** Envelope sender. */
	from: string;
	/** Envelope recipient (one message per recipient). */
	to: string;
	raw: ArrayBuffer;
	/** Lower-cased header names to values, as the Worker handler receives them. */
	headers: Record<string, string>;
};

export type IntakeActions = {
	/** Refuse the message at the edge; the SMTP listener answers 550, the relay tells the Worker to setReject. */
	reject?: (reason: string) => Promise<void> | void;
	/**
	 * Relay to another address. `raw` replaces the original MIME (a copy sent as
	 * the mailbox). `envelopeFrom` is the MAIL FROM the outbound relay will accept.
	 * Returns whether the relay accepted the message.
	 */
	forward?: (
		destination: string,
		headers: Record<string, string>,
		options?: { raw?: Uint8Array; envelopeFrom?: string },
	) => Promise<boolean>;
};

export type IntakeResult =
	| { action: "reject"; reason: string }
	| { action: "forward"; forwardedTo: string | null }
	| { action: "store"; rawR2Key: string; forwardedTo: string | null };
