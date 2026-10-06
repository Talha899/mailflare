import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldClassName } from "./input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
	({ className, ...props }, ref) => (
		<textarea
			className={cn("flex min-h-[88px] resize-y px-3 py-2.5 leading-relaxed", fieldClassName, className)}
			ref={ref}
			{...props}
		/>
	),
);
Textarea.displayName = "Textarea";
