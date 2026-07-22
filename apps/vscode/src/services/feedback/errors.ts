import type { FeedbackErrorCode } from "./types"

export class FeedbackApiError extends Error {
	readonly code: FeedbackErrorCode
	readonly status: number
	readonly retryable: boolean

	constructor(opts: {
		code: FeedbackErrorCode
		message: string
		status: number
		retryable?: boolean
	}) {
		super(opts.message)
		this.name = "FeedbackApiError"
		this.code = opts.code
		this.status = opts.status
		this.retryable = opts.retryable ?? false
	}
}

type HubErrorBody = {
	code?: string
	message?: string
	error?: string
	statusCode?: number
}

export function mapHttpStatusToFeedbackError(status: number, body?: HubErrorBody | null): FeedbackApiError {
	const hubCode = normalizeHubCode(body?.code)
	const message = pickMessage(body, status)

	if (status === 401) {
		return new FeedbackApiError({ code: "unauthorized", message, status })
	}
	if (status === 403) {
		return new FeedbackApiError({
			code: hubCode ?? "insufficient_permission",
			message,
			status,
		})
	}
	if (status === 404) {
		// Prefer Hub body (e.g. "App not found"); fall back to item-level copy.
		const notFoundMessage = body?.message || body?.error || "Feedback not found."
		return new FeedbackApiError({ code: "not_found", message: notFoundMessage, status })
	}
	if (status === 409) {
		return new FeedbackApiError({ code: "conflict", message, status })
	}
	if (status === 413) {
		return new FeedbackApiError({
			code: "payload_too_large",
			message: message || "Attachment exceeds the 5 MiB limit",
			status,
		})
	}
	if (status === 415) {
		return new FeedbackApiError({
			code: "unsupported_media_type",
			message: message || "Only png, jpeg, webp, and gif images are allowed",
			status,
		})
	}
	if (status === 429) {
		return new FeedbackApiError({
			code: "rate_limited",
			message: message || "Too many requests — try again shortly",
			status,
			retryable: true,
		})
	}

	return new FeedbackApiError({
		code: hubCode ?? "unknown",
		message,
		status,
		retryable: status >= 500,
	})
}

export function userFacingFeedbackError(error: unknown): string {
	if (error instanceof FeedbackApiError) {
		switch (error.code) {
			case "unauthorized":
				return "Your session expired. Please sign in again."
			case "app_mismatch":
				return "This account is not authorized for Axline feedback."
			case "not_member":
				return "You are not an active member of the Axline app."
			case "insufficient_permission":
				return "You do not have permission for this action."
			case "not_found": {
				const msg = error.message?.trim()
				return msg || "Feedback not found."
			}
			case "payload_too_large":
				return error.message
			case "unsupported_media_type":
				return error.message
			case "rate_limited":
				return error.message
			case "hub_unavailable":
				return "Feedback Hub is not available. Check AuthNexus configuration."
			case "network":
				return "Network error reaching Feedback Hub. Retry or check proxy settings."
			default:
				return error.message || "Feedback request failed."
		}
	}
	if (error instanceof Error && error.message) {
		return error.message
	}
	return "Feedback request failed."
}

function normalizeHubCode(code?: string): FeedbackErrorCode | undefined {
	switch (code) {
		case "app_mismatch":
		case "not_member":
		case "insufficient_permission":
			return code
		default:
			return undefined
	}
}

function pickMessage(body: HubErrorBody | null | undefined, status: number): string {
	return body?.message || body?.error || `Feedback Hub error (${status})`
}

export async function parseFeedbackErrorResponse(response: Response): Promise<FeedbackApiError> {
	let body: HubErrorBody | null = null
	try {
		const text = await response.text()
		if (text) {
			body = JSON.parse(text) as HubErrorBody
		}
	} catch {
		body = null
	}
	return mapHttpStatusToFeedbackError(response.status, body)
}
