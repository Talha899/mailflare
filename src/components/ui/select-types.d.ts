import type * as React from "react";

export type SelectProps = {
	value?: string | number | null;
	defaultValue?: string | number;
	/** Native-compatible: receives an event-like object whose `target.value` is the new value. */
	onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
	/** Convenience alternative to onChange. */
	onValueChange?: (value: string) => void;
	/** `<option>` and `<optgroup>` elements, exactly as for a native select. */
	children?: React.ReactNode;
	className?: string;
	/** Kept for existing callers; merged onto the trigger. */
	containerClassName?: string;
	disabled?: boolean;
	required?: boolean;
	name?: string;
	id?: string;
	placeholder?: string;
	size?: "default" | "sm";
	"aria-label"?: string;
	"aria-labelledby"?: string;
	"aria-describedby"?: string;
	"aria-invalid"?: boolean | "true" | "false";
};

export type SelectOptionItem = {
	value: string;
	label: React.ReactNode;
	disabled?: boolean;
};

export type SelectOptionGroup = {
	label?: string;
	options: SelectOptionItem[];
};
