import { FEEDBACK_DEFAULT_PAGE_LIMIT, FEEDBACK_MAX_PAGE_LIMIT, type ListFeedbackQuery } from "./types"

export function feedbackApiRoot(baseUrl: string, appId: string): string {
	const trimmed = baseUrl.replace(/\/$/, "")
	return `${trimmed}/api/apps/${encodeURIComponent(appId)}/feedback`
}

export function buildListFeedbackUrl(baseUrl: string, appId: string, query: ListFeedbackQuery): string {
	const root = feedbackApiRoot(baseUrl, appId)
	const page = Math.max(1, query.page ?? 1)
	const limit = Math.min(FEEDBACK_MAX_PAGE_LIMIT, Math.max(1, query.limit ?? FEEDBACK_DEFAULT_PAGE_LIMIT))
	const params = new URLSearchParams({
		scope: query.scope,
		page: String(page),
		limit: String(limit),
	})
	if (query.status) {
		params.set("status", query.status)
	}
	return `${root}?${params.toString()}`
}

export function buildFeedbackByNumberUrl(baseUrl: string, appId: string, number: number): string {
	return `${feedbackApiRoot(baseUrl, appId)}/by-number/${encodeURIComponent(String(number))}`
}

export function buildFeedbackCommentsUrl(baseUrl: string, appId: string, number: number): string {
	return `${buildFeedbackByNumberUrl(baseUrl, appId, number)}/comments`
}

export function buildFeedbackAttachmentUrl(baseUrl: string, appId: string, feedbackId: string, attachmentId: string): string {
	const root = feedbackApiRoot(baseUrl, appId)
	return `${root}/${encodeURIComponent(feedbackId)}/attachments/${encodeURIComponent(attachmentId)}`
}

/** Reject any `/uploads/` absolute or relative URL (Hub §3.5). */
export function assertAuthenticatedAttachmentPath(downloadPath: string): void {
	const lower = downloadPath.toLowerCase()
	if (lower.includes("/uploads/") || lower.startsWith("/uploads")) {
		throw new Error("Feedback attachment must not use public /uploads URL")
	}
	if (!lower.includes("/feedback/") || !lower.includes("/attachments/")) {
		throw new Error("Feedback attachment path is not an authenticated Hub download API")
	}
}
