import { FeedbackApiError, parseFeedbackErrorResponse } from "./errors"
import type {
	CreateFeedbackInput,
	FeedbackAttachmentBytes,
	FeedbackClient,
	FeedbackItem,
	FeedbackPage,
	ListFeedbackQuery,
} from "./types"
import {
	FEEDBACK_ALLOWED_MIME,
	FEEDBACK_DEFAULT_PAGE_LIMIT,
	FEEDBACK_MAX_ATTACHMENT_BYTES,
	FEEDBACK_MAX_ATTACHMENTS,
	FEEDBACK_MAX_PAGE_LIMIT,
} from "./types"
import {
	assertAuthenticatedAttachmentPath,
	buildFeedbackAttachmentUrl,
	buildFeedbackByNumberUrl,
	buildFeedbackCommentsUrl,
	buildListFeedbackUrl,
	feedbackApiRoot,
} from "./urls"

const HTTP_TIMEOUT_MS = 30_000

export type RestFeedbackClientOptions = {
	baseUrl: string
	appId: string
	/** Returns a raw JWT (no workos:/axgate: prefix). */
	getAccessToken: () => Promise<string | null>
	/**
	 * Called once after a 401. Should single-flight refresh and return a new token.
	 * If null/throws, the original 401 is surfaced (caller may deauth).
	 */
	refreshAccessToken: () => Promise<string | null>
}

export class RestFeedbackClient implements FeedbackClient {
	constructor(private readonly opts: RestFeedbackClientOptions) {}

	async list(query: ListFeedbackQuery): Promise<FeedbackPage> {
		const url = buildListFeedbackUrl(this.opts.baseUrl, this.opts.appId, query)
		const page = Math.max(1, query.page ?? 1)
		const limit = Math.min(FEEDBACK_MAX_PAGE_LIMIT, Math.max(1, query.limit ?? FEEDBACK_DEFAULT_PAGE_LIMIT))
		try {
			const data = await this.requestJson<FeedbackPage>("GET", url)
			return normalizePage(data)
		} catch (error) {
			// List never uses item-level 404 semantics; treat as empty so Mine/Public
			// show the empty state instead of "Feedback not found. Retry".
			if (error instanceof FeedbackApiError && error.code === "not_found") {
				return { items: [], total: 0, page, limit }
			}
			throw error
		}
	}

	async getByNumber(number: number): Promise<FeedbackItem> {
		const url = buildFeedbackByNumberUrl(this.opts.baseUrl, this.opts.appId, number)
		const item = await this.requestJson<FeedbackItem>("GET", url)
		return normalizeItem(item)
	}

	async create(input: CreateFeedbackInput): Promise<FeedbackItem> {
		validateUploads(input.files)
		const url = feedbackApiRoot(this.opts.baseUrl, this.opts.appId)
		const form = new FormData()
		form.append("type", input.type)
		form.append("title", input.title)
		form.append("body", input.body)
		if (input.visibility) {
			form.append("visibility", input.visibility)
		}
		if (input.clientContext) {
			form.append("clientContext", JSON.stringify(input.clientContext))
		}
		for (const file of input.files ?? []) {
			const bytes = Buffer.from(file.data)
			const blob = new Blob([bytes], { type: file.mimeType })
			form.append("files", blob, file.fileName)
		}
		const item = await this.requestJson<FeedbackItem>("POST", url, { formData: form })
		return normalizeItem(item)
	}

	async addComment(number: number, body: string): Promise<FeedbackItem> {
		const url = buildFeedbackCommentsUrl(this.opts.baseUrl, this.opts.appId, number)
		const item = await this.requestJson<FeedbackItem>("POST", url, {
			json: { body },
		})
		return normalizeItem(item)
	}

	async downloadAttachment(feedbackId: string, attachmentId: string): Promise<FeedbackAttachmentBytes> {
		const url = buildFeedbackAttachmentUrl(this.opts.baseUrl, this.opts.appId, feedbackId, attachmentId)
		assertAuthenticatedAttachmentPath(new URL(url).pathname)
		const response = await this.fetchWithAuth(url, { method: "GET" })
		if (!response.ok) {
			throw await parseFeedbackErrorResponse(response)
		}
		const mimeType = response.headers.get("content-type") || "application/octet-stream"
		const disposition = response.headers.get("content-disposition") || ""
		const displayName = parseFilename(disposition) || attachmentId
		const data = new Uint8Array(await response.arrayBuffer())
		return { mimeType, displayName, data }
	}

	private async requestJson<T>(method: string, url: string, opts?: { json?: unknown; formData?: FormData }): Promise<T> {
		const init: RequestInit = { method }
		if (opts?.formData) {
			init.body = opts.formData
		} else if (opts?.json !== undefined) {
			init.headers = { "Content-Type": "application/json" }
			init.body = JSON.stringify(opts.json)
		}
		const response = await this.fetchWithAuth(url, init)
		if (!response.ok) {
			throw await parseFeedbackErrorResponse(response)
		}
		return (await response.json()) as T
	}

	private async fetchWithAuth(url: string, init: RequestInit, retried = false): Promise<Response> {
		const token = await this.opts.getAccessToken()
		if (!token) {
			throw new FeedbackApiError({
				code: "unauthorized",
				message: "Not authenticated",
				status: 401,
			})
		}

		let response: Response
		try {
			response = await fetch(url, {
				...init,
				headers: {
					...(init.headers || {}),
					Authorization: `Bearer ${token}`,
				},
				signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
			})
		} catch (error) {
			throw new FeedbackApiError({
				code: "network",
				message: error instanceof Error ? error.message : "Network error",
				status: 0,
				retryable: true,
			})
		}

		if (response.status === 401 && !retried) {
			const refreshed = await this.opts.refreshAccessToken()
			if (refreshed) {
				return this.fetchWithAuth(url, init, true)
			}
		}

		return response
	}
}

function validateUploads(files: CreateFeedbackInput["files"]): void {
	if (!files?.length) {
		return
	}
	if (files.length > FEEDBACK_MAX_ATTACHMENTS) {
		throw new FeedbackApiError({
			code: "payload_too_large",
			message: `At most ${FEEDBACK_MAX_ATTACHMENTS} attachments are allowed`,
			status: 413,
		})
	}
	for (const file of files) {
		if (!FEEDBACK_ALLOWED_MIME.includes(file.mimeType as (typeof FEEDBACK_ALLOWED_MIME)[number])) {
			throw new FeedbackApiError({
				code: "unsupported_media_type",
				message: "Allowed attachments: png, jpeg, webp, gif, pdf, txt, md, log, json, csv, xml, docx",
				status: 415,
			})
		}
		if (file.data.byteLength > FEEDBACK_MAX_ATTACHMENT_BYTES) {
			throw new FeedbackApiError({
				code: "payload_too_large",
				message: "Attachment exceeds the 10 MB limit",
				status: 413,
			})
		}
	}
}

function normalizePage(data: FeedbackPage): FeedbackPage {
	return {
		items: (data.items ?? []).map(normalizeItem),
		total: data.total ?? 0,
		page: data.page ?? 1,
		limit: data.limit ?? 20,
	}
}

function normalizeItem(item: FeedbackItem): FeedbackItem {
	for (const att of item.attachments ?? []) {
		assertAuthenticatedAttachmentPath(att.downloadPath)
	}
	return item
}

function parseFilename(disposition: string): string | undefined {
	const match = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(disposition)
	if (!match?.[1]) {
		return undefined
	}
	try {
		return decodeURIComponent(match[1])
	} catch {
		return match[1]
	}
}
