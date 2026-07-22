import type { FeedbackClientContext } from "./types"

/** Non-sensitive client context keys (plan §6.4). All are required on submit. */
export const FEEDBACK_CONTEXT_KEYS = [
	"axlineVersion",
	"vscodeVersion",
	"uiKind",
	"platform",
	"arch",
	"appName",
	"language",
	"extensionMode",
] as const

/** Keys that must always be attached (cannot be opted out). */
export const FEEDBACK_REQUIRED_CONTEXT_KEYS = FEEDBACK_CONTEXT_KEYS

export type FeedbackContextKey = (typeof FEEDBACK_CONTEXT_KEYS)[number]

/** Filter context to only allowlisted keys the user kept checked. */
export function filterFeedbackClientContext(full: FeedbackClientContext, selectedKeys: readonly string[]): FeedbackClientContext {
	const allowed = new Set(selectedKeys)
	const out: FeedbackClientContext = {}
	for (const key of FEEDBACK_CONTEXT_KEYS) {
		if (allowed.has(key) && full[key] !== undefined) {
			out[key] = full[key]
		}
	}
	return out
}

/**
 * Merge user selection with required keys from the host-collected full context.
 * Required keys always win so the webview cannot strip version / platform info.
 */
export function mergeRequiredFeedbackClientContext(
	full: FeedbackClientContext,
	selectedKeys: readonly string[],
): FeedbackClientContext {
	const required = new Set<string>(FEEDBACK_REQUIRED_CONTEXT_KEYS)
	const selected = new Set(selectedKeys)
	const out: FeedbackClientContext = {}
	for (const key of FEEDBACK_CONTEXT_KEYS) {
		if ((required.has(key) || selected.has(key)) && full[key] !== undefined) {
			out[key] = full[key]
		}
	}
	return out
}

export function serializeFeedbackClientContext(ctx: FeedbackClientContext): string {
	return JSON.stringify(ctx)
}
