import {
	FileArchive,
	FileCode,
	FileSpreadsheet,
	FileText,
	FileType,
	FileVideoCamera,
	Image,
	Music,
	Presentation,
} from "lucide-react";
import type { MessageAttachment } from "@/app/(dashboard)/inbox/[messageId]/types";
import type { AttachmentVisual } from "./message-attachment-card-types";
import { getAttachmentPreviewKind } from "./message-attachment-viewer-utils";

export function getAttachmentVisual(
	attachment: Pick<MessageAttachment, "filename" | "type">,
): AttachmentVisual {
	const type = attachment.type.toLowerCase();
	const filename = attachment.filename.toLowerCase();
	const previewKind = getAttachmentPreviewKind(attachment);

	if (previewKind === "image") {
		return {
			icon: Image,
			iconClassName: "bg-[var(--accent)] text-[var(--primary)]",
			label: "Image",
			thumbnail: "image",
		};
	}
	if (previewKind === "video") {
		return {
			icon: FileVideoCamera,
			iconClassName: "bg-[color-mix(in_oklab,var(--destructive)_10%,var(--card))] text-[var(--destructive)]",
			label: "Video",
			thumbnail: "video",
		};
	}
	if (previewKind === "audio") {
		return {
			icon: Music,
			iconClassName: "bg-[var(--muted)] text-[var(--foreground)]",
			label: "Audio",
			thumbnail: null,
		};
	}
	if (previewKind === "pdf") {
		return {
			icon: FileText,
			iconClassName: "bg-[color-mix(in_oklab,var(--destructive)_10%,var(--card))] text-[var(--destructive)]",
			label: "PDF",
			thumbnail: null,
		};
	}
	if (
		type.includes("spreadsheet") ||
		type.includes("excel") ||
		type === "text/csv" ||
		/\.(csv|xls|xlsx|ods)$/.test(filename)
	) {
		return {
			icon: FileSpreadsheet,
			iconClassName: "bg-[color-mix(in_oklab,var(--success)_10%,var(--card))] text-[var(--success)]",
			label: "Spreadsheet",
			thumbnail: null,
		};
	}
	if (
		type.includes("presentation") ||
		type.includes("powerpoint") ||
		/\.(ppt|pptx|odp)$/.test(filename)
	) {
		return {
			icon: Presentation,
			iconClassName: "bg-[var(--muted)] text-[var(--foreground)]",
			label: "Presentation",
			thumbnail: null,
		};
	}
	if (
		type.includes("zip") ||
		type.includes("compressed") ||
		type.includes("archive") ||
		/\.(zip|rar|7z|tar|gz|bz2)$/.test(filename)
	) {
		return {
			icon: FileArchive,
			iconClassName: "bg-[var(--muted)] text-[var(--foreground)]",
			label: "Archive",
			thumbnail: null,
		};
	}
	if (
		type.includes("json") ||
		type.includes("xml") ||
		type.includes("javascript") ||
		type.includes("typescript") ||
		/\.(js|jsx|ts|tsx|json|xml|html|css|md|yml|yaml)$/.test(filename)
	) {
		return {
			icon: FileCode,
			iconClassName: "bg-[color-mix(in_oklab,var(--primary)_12%,var(--card))] text-[var(--primary)]",
			label: "Code",
			thumbnail: null,
		};
	}
	if (previewKind === "text" || type.includes("word") || /\.(doc|docx|odt|rtf|txt)$/.test(filename)) {
		return {
			icon: FileType,
			iconClassName: "bg-[var(--accent)] text-[var(--primary)]",
			label: "Document",
			thumbnail: null,
		};
	}

	return {
		icon: FileText,
		iconClassName: "bg-[var(--muted)] text-[var(--muted-foreground)]",
		label: "File",
		thumbnail: null,
	};
}
