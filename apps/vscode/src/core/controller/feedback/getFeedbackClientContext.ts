import type { EmptyRequest } from "@shared/proto/cline/common"
import { FeedbackClientContextResponse } from "@shared/proto/cline/feedback"
import { FeedbackService } from "@/services/feedback/feedback-service"
import type { Controller } from "../index"
import { errorFields } from "./mappers"

export async function getFeedbackClientContext(
	controller: Controller,
	_request: EmptyRequest,
): Promise<FeedbackClientContextResponse> {
	try {
		const ctx = FeedbackService.getInstance().getClientContext(controller.context.extensionMode)
		return FeedbackClientContextResponse.create({
			axlineVersion: ctx.axlineVersion ?? "",
			vscodeVersion: ctx.vscodeVersion ?? "",
			uiKind: ctx.uiKind ?? "",
			platform: ctx.platform ?? "",
			arch: ctx.arch ?? "",
			appName: ctx.appName ?? "",
			language: ctx.language ?? "",
			extensionMode: ctx.extensionMode ?? "",
			error: "",
		})
	} catch (error) {
		const { error: message } = errorFields(error)
		return FeedbackClientContextResponse.create({ error: message })
	}
}
