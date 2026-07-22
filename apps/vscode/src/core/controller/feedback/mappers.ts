import { FeedbackAttachmentProto, FeedbackCommentProto, FeedbackDetail, FeedbackListItem } from "@shared/proto/cline/feedback"
import { FeedbackApiError } from "@/services/feedback/errors"
import { feedbackStatusLabel } from "@/services/feedback/status-labels"
import type { FeedbackItem } from "@/services/feedback/types"

export function toFeedbackListItem(item: FeedbackItem): FeedbackListItem {
	return FeedbackListItem.create({
		id: item.id,
		number: item.number,
		type: item.type,
		title: item.title,
		status: item.status,
		statusLabel: feedbackStatusLabel(item.status),
		visibility: item.visibility,
		updatedAt: toIso(item.updatedAt),
		createdAt: toIso(item.createdAt),
	})
}

export function toFeedbackDetail(item: FeedbackItem, opts?: { canComment?: boolean }): FeedbackDetail {
	const authorDisplay = item.author?.realName || item.author?.username || item.authorId || ""
	return FeedbackDetail.create({
		id: item.id,
		number: item.number,
		type: item.type,
		title: item.title,
		body: item.body,
		status: item.status,
		statusLabel: feedbackStatusLabel(item.status),
		visibility: item.visibility,
		authorId: item.authorId,
		authorDisplay,
		externalPrUrl: item.externalPrUrl ?? "",
		releaseVersion: item.releaseVersion ?? "",
		createdAt: toIso(item.createdAt),
		updatedAt: toIso(item.updatedAt),
		clientContextJson: item.clientContext ? JSON.stringify(item.clientContext) : "",
		comments: (item.comments ?? []).map((c) =>
			FeedbackCommentProto.create({
				id: c.id,
				authorType: c.authorType,
				authorDisplay: c.author?.realName || c.author?.username || c.authorId || c.agentName || c.authorType,
				agentName: c.agentName ?? "",
				body: c.body,
				createdAt: toIso(c.createdAt),
			}),
		),
		attachments: (item.attachments ?? []).map((a) =>
			FeedbackAttachmentProto.create({
				id: a.id,
				mimeType: a.mimeType,
				sizeBytes: a.sizeBytes,
				displayName: a.displayName,
				downloadPath: a.downloadPath,
			}),
		),
		canComment: opts?.canComment ?? true,
	})
}

export function errorFields(error: unknown): { error: string; errorCode: string } {
	if (error instanceof FeedbackApiError) {
		return { error: error.message, errorCode: error.code }
	}
	if (error instanceof Error) {
		return { error: error.message, errorCode: "unknown" }
	}
	return { error: "Feedback request failed", errorCode: "unknown" }
}

function toIso(value: string | Date): string {
	if (value instanceof Date) {
		return value.toISOString()
	}
	return String(value)
}
