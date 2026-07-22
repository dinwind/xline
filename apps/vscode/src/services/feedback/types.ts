/**
 * AuthNexus Feedback Hub client types — aligned with Hub plan v0.2.0 §3
 * and OpenAPI draft `doc/guide/feedback-hub-openapi-draft.md`.
 */

export const FEEDBACK_APP_ID = "axline"

export {
	FEEDBACK_ALLOWED_MIME,
	FEEDBACK_MAX_ATTACHMENT_BYTES,
	FEEDBACK_MAX_ATTACHMENTS,
} from "@shared/feedback-attachments"
export const FEEDBACK_DEFAULT_PAGE_LIMIT = 20
export const FEEDBACK_MAX_PAGE_LIMIT = 100

export type FeedbackType = "BUG" | "FEATURE" | "QUESTION"
export type FeedbackVisibility = "PRIVATE" | "PUBLIC"
export type FeedbackStatus =
	| "OPEN"
	| "TRIAGING"
	| "NEEDS_INFO"
	| "ACCEPTED"
	| "QUEUED"
	| "IMPLEMENTING"
	| "IN_REVIEW"
	| "DONE"
	| "REJECTED"
	| "DUPLICATE"

export type FeedbackCommentAuthorType = "USER" | "HUMAN_ADMIN" | "AI_AGENT" | "SYSTEM"
export type FeedbackListScope = "mine" | "public"

export type FeedbackErrorCode =
	| "app_mismatch"
	| "not_member"
	| "insufficient_permission"
	| "not_found"
	| "payload_too_large"
	| "unsupported_media_type"
	| "rate_limited"
	| "conflict"
	| "unauthorized"
	| "network"
	| "hub_unavailable"
	| "unknown"

export type FeedbackAuthor = {
	id: string
	username?: string
	realName?: string
}

export type FeedbackAttachmentRef = {
	id: string
	mimeType: string
	sizeBytes: number
	displayName: string
	/** Hub-relative authenticated download path — never `/uploads/*`. */
	downloadPath: string
}

export type FeedbackComment = {
	id: string
	authorType: FeedbackCommentAuthorType
	authorId?: string
	author?: FeedbackAuthor
	agentName?: string
	body: string
	metadata?: unknown
	createdAt: string
}

export type FeedbackItem = {
	id: string
	number: number
	type: FeedbackType
	title: string
	body: string
	status: FeedbackStatus
	visibility: FeedbackVisibility
	authorId: string
	author?: FeedbackAuthor
	priority?: string
	labels?: string[]
	clientContext?: FeedbackClientContext | Record<string, unknown>
	duplicateOfId?: string
	externalPrUrl?: string
	releaseVersion?: string
	createdAt: string
	updatedAt: string
	comments?: FeedbackComment[]
	attachments?: FeedbackAttachmentRef[]
	allowedTransitions?: string[]
	canDispatch?: boolean
}

export type FeedbackPage = {
	items: FeedbackItem[]
	total: number
	page: number
	limit: number
}

export type FeedbackClientContext = {
	axlineVersion?: string
	vscodeVersion?: string
	uiKind?: string
	platform?: string
	arch?: string
	appName?: string
	language?: string
	extensionMode?: string
}

export type FeedbackAttachmentUpload = {
	fileName: string
	mimeType: string
	data: Uint8Array
}

export type CreateFeedbackInput = {
	type: FeedbackType
	title: string
	body: string
	visibility?: FeedbackVisibility
	clientContext?: FeedbackClientContext | Record<string, unknown>
	files?: FeedbackAttachmentUpload[]
}

export type ListFeedbackQuery = {
	scope: FeedbackListScope
	page?: number
	limit?: number
	status?: FeedbackStatus
}

export type FeedbackAttachmentBytes = {
	mimeType: string
	displayName: string
	data: Uint8Array
}

export interface FeedbackClient {
	list(query: ListFeedbackQuery): Promise<FeedbackPage>
	getByNumber(number: number): Promise<FeedbackItem>
	create(input: CreateFeedbackInput): Promise<FeedbackItem>
	addComment(number: number, body: string): Promise<FeedbackItem>
	downloadAttachment(feedbackId: string, attachmentId: string): Promise<FeedbackAttachmentBytes>
}
