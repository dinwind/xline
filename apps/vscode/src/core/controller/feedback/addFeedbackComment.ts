import { AddFeedbackCommentRequest, FeedbackItemResponse } from "@shared/proto/cline/feedback"
import { FeedbackService } from "@/services/feedback/feedback-service"
import type { Controller } from "../index"
import { errorFields, toFeedbackDetail } from "./mappers"

export async function addFeedbackComment(
	_controller: Controller,
	request: AddFeedbackCommentRequest,
): Promise<FeedbackItemResponse> {
	try {
		if (!request.body?.trim()) {
			return FeedbackItemResponse.create({ error: "Comment cannot be empty", errorCode: "unknown" })
		}
		const item = await FeedbackService.getInstance().addComment(request.number, request.body.trim())
		return FeedbackItemResponse.create({
			item: toFeedbackDetail(item, { canComment: true }),
			error: "",
			errorCode: "",
		})
	} catch (error) {
		const fields = errorFields(error)
		return FeedbackItemResponse.create({
			error: FeedbackService.getInstance().formatError(error),
			errorCode: fields.errorCode,
		})
	}
}
