import { EmptyRequest } from "@shared/proto/cline/common"
import { FeedbackOpenEvent } from "@shared/proto/cline/feedback"
import { Logger } from "@/shared/services/Logger"
import { getRequestRegistry, StreamingResponseHandler } from "../grpc-handler"
import type { Controller } from "../index"

const activeSubscriptions = new Set<StreamingResponseHandler<FeedbackOpenEvent>>()

export async function subscribeToFeedbackOpened(
	_controller: Controller,
	_request: EmptyRequest,
	responseStream: StreamingResponseHandler<FeedbackOpenEvent>,
	requestId?: string,
): Promise<void> {
	activeSubscriptions.add(responseStream)
	const cleanup = () => {
		activeSubscriptions.delete(responseStream)
	}
	if (requestId) {
		getRequestRegistry().registerRequest(requestId, cleanup, { type: "feedbackOpened_subscription" }, responseStream)
	}
}

export type FeedbackOpenMode = "list" | "new"

export async function sendFeedbackOpenedEvent(mode: FeedbackOpenMode = "list"): Promise<void> {
	const event = FeedbackOpenEvent.create({ mode })
	const promises = Array.from(activeSubscriptions).map(async (responseStream) => {
		try {
			await responseStream(event, false)
		} catch (error) {
			Logger.error("Error sending feedbackOpened event:", error)
			activeSubscriptions.delete(responseStream)
		}
	})
	await Promise.all(promises)
}
