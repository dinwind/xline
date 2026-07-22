/**
 * Feedback Hub attachment constraints — keep in sync with AuthNexus
 * `feedback.service.ts` MIME_WHITELIST and OpenAPI draft.
 */

export const FEEDBACK_ALLOWED_MIME = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif",
	"application/pdf",
	"text/plain",
	"text/markdown",
	"text/csv",
	"text/xml",
	"application/xml",
	"application/json",
	"application/x-ndjson",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const

export type FeedbackAllowedMime = (typeof FEEDBACK_ALLOWED_MIME)[number]

/** Per-file size limit (10 MB). */
export const FEEDBACK_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const FEEDBACK_MAX_ATTACHMENTS = 5

/** Human-readable size for UI / error copy. */
export const FEEDBACK_MAX_ATTACHMENT_SIZE_LABEL = "10 MB"

/** Human-readable accept list for the file picker / dropzone copy. */
export const FEEDBACK_ATTACHMENT_ACCEPT_LABEL = "png / jpeg / webp / gif / pdf / txt / md / log / json / csv / xml / docx"

/** `accept` attribute for `<input type="file">`. */
export const FEEDBACK_ATTACHMENT_ACCEPT = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif",
	"application/pdf",
	"text/plain",
	"text/markdown",
	"text/csv",
	"text/xml",
	"application/xml",
	"application/json",
	"application/x-ndjson",
	".md",
	".log",
	".jsonl",
	".csv",
	".xml",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".docx",
].join(",")

export function isFeedbackAllowedMime(mimeType: string): mimeType is FeedbackAllowedMime {
	return (FEEDBACK_ALLOWED_MIME as readonly string[]).includes(mimeType)
}

export function isFeedbackImageMime(mimeType: string): boolean {
	return mimeType.startsWith("image/") && isFeedbackAllowedMime(mimeType)
}

/** Map common extensions when the browser leaves `file.type` empty (e.g. .log / .md). */
export function resolveFeedbackMime(fileName: string, mimeType: string): string {
	const trimmed = mimeType.trim().toLowerCase()
	if (trimmed && isFeedbackAllowedMime(trimmed)) {
		return trimmed
	}
	const lower = fileName.toLowerCase()
	if (lower.endsWith(".png")) return "image/png"
	if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
	if (lower.endsWith(".webp")) return "image/webp"
	if (lower.endsWith(".gif")) return "image/gif"
	if (lower.endsWith(".pdf")) return "application/pdf"
	if (lower.endsWith(".txt") || lower.endsWith(".log")) return "text/plain"
	if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "text/markdown"
	if (lower.endsWith(".csv")) return "text/csv"
	if (lower.endsWith(".xml")) return "application/xml"
	if (lower.endsWith(".json")) return "application/json"
	if (lower.endsWith(".jsonl") || lower.endsWith(".ndjson")) return "application/x-ndjson"
	if (lower.endsWith(".docx")) {
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	}
	return trimmed
}
