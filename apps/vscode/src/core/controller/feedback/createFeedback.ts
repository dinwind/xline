import { CreateFeedbackRequest, FeedbackItemResponse } from "@shared/proto/cline/feedback"
import { mergeRequiredFeedbackClientContext } from "@/services/feedback/client-context-pure"
import { FeedbackService } from "@/services/feedback/feedback-service"
import type { FeedbackType } from "@/services/feedback/types"
import type { Controller } from "../index"
import { errorFields, toFeedbackDetail } from "./mappers"

export async function createFeedback(controller: Controller, request: CreateFeedbackRequest): Promise<FeedbackItemResponse> {
	try {
		const type = normalizeType(request.type)
		if (!request.title?.trim()) {
			return FeedbackItemResponse.create({ error: "Title is required", errorCode: "unknown" })
		}
		if (!request.body?.trim()) {
			return FeedbackItemResponse.create({ error: "Description is required", errorCode: "unknown" })
		}

		const fullContext = FeedbackService.getInstance().getClientContext(controller.context.extensionMode)
		let selectedKeys: string[] = []
		if (request.clientContextJson?.trim()) {
			try {
				selectedKeys = Object.keys(JSON.parse(request.clientContextJson) as Record<string, unknown>)
			} catch {
				selectedKeys = []
			}
		}
		const clientContext = mergeRequiredFeedbackClientContext(fullContext, selectedKeys)

		const item = await FeedbackService.getInstance().create({
			type,
			title: request.title.trim(),
			body: request.body.trim(),
			visibility: "PRIVATE",
			clientContext,
			files: (request.attachments ?? []).map((a) => ({
				fileName: a.fileName || "attachment",
				mimeType: a.mimeType,
				data: a.data,
			})),
		})

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

function normalizeType(value: string): FeedbackType {
	const upper = value.toUpperCase()
	if (upper === "FEATURE" || upper === "QUESTION" || upper === "BUG") {
		return upper
	}
	return "BUG"
}
