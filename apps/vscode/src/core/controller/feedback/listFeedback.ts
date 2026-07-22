import { ListFeedbackRequest, ListFeedbackResponse } from "@shared/proto/cline/feedback"
import { FeedbackService } from "@/services/feedback/feedback-service"
import type { FeedbackListScope } from "@/services/feedback/types"
import type { Controller } from "../index"
import { errorFields, toFeedbackListItem } from "./mappers"

export async function listFeedback(_controller: Controller, request: ListFeedbackRequest): Promise<ListFeedbackResponse> {
	try {
		const scope = (request.scope === "public" ? "public" : "mine") as FeedbackListScope
		const page = await FeedbackService.getInstance().list({
			scope,
			page: request.page || 1,
			limit: request.limit || 20,
		})
		return ListFeedbackResponse.create({
			items: page.items.map(toFeedbackListItem),
			total: page.total,
			page: page.page,
			limit: page.limit,
			error: "",
			errorCode: "",
		})
	} catch (error) {
		const fields = errorFields(error)
		return ListFeedbackResponse.create({
			items: [],
			total: 0,
			page: request.page || 1,
			limit: request.limit || 20,
			error: FeedbackService.getInstance().formatError(error),
			errorCode: fields.errorCode,
		})
	}
}
