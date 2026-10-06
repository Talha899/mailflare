import * as React from "react";
import type { SelectOptionGroup, SelectOptionItem } from "./select-types";

/** Radix reserves "" for "no selection", so a real empty-string option is encoded. */
export const EMPTY_SELECT_VALUE = "__select-empty__";

export function toRadixValue(value: string): string {
	return value === "" ? EMPTY_SELECT_VALUE : value;
}

export function fromRadixValue(value: string): string {
	return value === EMPTY_SELECT_VALUE ? "" : value;
}

function readOption(element: React.ReactElement<{ value?: unknown; children?: React.ReactNode; disabled?: boolean }>): SelectOptionItem {
	const { value, children, disabled } = element.props;
	const label = children ?? String(value ?? "");
	return { value: value === undefined ? String(textOf(children)) : String(value), label, disabled: !!disabled };
}

function textOf(node: React.ReactNode): string {
	if (node === null || node === undefined || typeof node === "boolean") return "";
	if (typeof node === "string" || typeof node === "number") return String(node);
	if (Array.isArray(node)) return node.map(textOf).join("");
	if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
	return "";
}

/** Turns native `<option>` / `<optgroup>` children (including fragments and arrays) into groups. */
export function readSelectOptions(children: React.ReactNode): SelectOptionGroup[] {
	const groups: SelectOptionGroup[] = [{ options: [] }];
	function visit(node: React.ReactNode) {
		React.Children.forEach(node, (child) => {
			if (!React.isValidElement(child)) return;
			if (child.type === React.Fragment) {
				visit((child.props as { children?: React.ReactNode }).children);
				return;
			}
			if (child.type === "optgroup") {
				const props = child.props as { label?: string; children?: React.ReactNode };
				const group: SelectOptionGroup = { label: props.label, options: [] };
				React.Children.forEach(props.children, (option) => {
					if (React.isValidElement(option) && option.type === "option") group.options.push(readOption(option as never));
				});
				groups.push(group);
				return;
			}
			if (child.type === "option") groups[0]!.options.push(readOption(child as never));
		});
	}
	visit(children);
	return groups.filter((group) => group.options.length > 0);
}
