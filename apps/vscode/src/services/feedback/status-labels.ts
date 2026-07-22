import type { FeedbackStatus } from "./types"

/** Hub status → user-visible label (client plan §7). */
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
	OPEN: "Open",
	TRIAGING: "Under review",
	NEEDS_INFO: "Needs your reply",
	ACCEPTED: "Accepted",
	QUEUED: "Queued for work",
	IMPLEMENTING: "In progress",
	IN_REVIEW: "In review",
	DONE: "Done / Shipped",
	REJECTED: "Closed",
	DUPLICATE: "Duplicate",
}

export type FeedbackStatusTone = "neutral" | "info" | "warning" | "accent" | "success" | "muted"

export function feedbackStatusLabel(status: string): string {
	return FEEDBACK_STATUS_LABELS[status as FeedbackStatus] ?? status
}

export function feedbackStatusTone(status: string): FeedbackStatusTone {
	switch (status) {
		case "OPEN":
		case "REJECTED":
		case "DUPLICATE":
			return "muted"
		case "TRIAGING":
		case "ACCEPTED":
			return "info"
		case "NEEDS_INFO":
			return "warning"
		case "QUEUED":
		case "IMPLEMENTING":
		case "IN_REVIEW":
			return "accent"
		case "DONE":
			return "success"
		default:
			return "neutral"
	}
}
