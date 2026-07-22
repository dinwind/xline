import { FeedbackItemResponse, GetFeedbackRequest } from "@shared/proto/cline/feedback"
import { FeedbackService } from "@/services/feedback/feedback-service"
import type { Controller } from "../index"
import { errorFields, toFeedbackDetail } from "./mappers"

export async function getFeedback(_controller: Controller, request: GetFeedbackRequest): Promise<FeedbackItemResponse> {
	try {
		const item = await FeedbackService.getInstance().getByNumber(request.number)
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
