import * as React from "react";
import { Select } from "@/components/ui/select";
import type { SelectProps } from "@/components/ui/select-types";
import { cn } from "@/lib/utils";

/** The routing-rule editor's select: the shared custom Select at the rule form's height. */
export const RoutingRuleSelect = React.forwardRef<HTMLButtonElement, SelectProps>(
	({ className, ...props }, ref) => <Select ref={ref} className={cn("h-10", className)} {...props} />,
);
RoutingRuleSelect.displayName = "RoutingRuleSelect";
