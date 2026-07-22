import { FeedbackAttachmentResponse, GetFeedbackAttachmentRequest } from "@shared/proto/cline/feedback"
import { FeedbackService } from "@/services/feedback/feedback-service"
import type { Controller } from "../index"
import { errorFields } from "./mappers"

export async function getFeedbackAttachment(
	_controller: Controller,
	request: GetFeedbackAttachmentRequest,
): Promise<FeedbackAttachmentResponse> {
	try {
		const file = await FeedbackService.getInstance().downloadAttachment(request.feedbackId, request.attachmentId)
		return FeedbackAttachmentResponse.create({
			mimeType: file.mimeType,
			displayName: file.displayName,
			data: file.data,
			error: "",
			errorCode: "",
		})
	} catch (error) {
		const fields = errorFields(error)
		return FeedbackAttachmentResponse.create({
			error: FeedbackService.getInstance().formatError(error),
			errorCode: fields.errorCode,
		})
	}
}
