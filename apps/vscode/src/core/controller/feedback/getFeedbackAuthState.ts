import type { EmptyRequest } from "@shared/proto/cline/common"
import { FeedbackAuthState } from "@shared/proto/cline/feedback"
import { AuthService } from "@/sdk/auth-service"
import { getFeedbackConfig } from "@/services/feedback/config"
import { FeedbackService } from "@/services/feedback/feedback-service"
import type { Controller } from "../index"

export async function getFeedbackAuthState(_controller: Controller, _request: EmptyRequest): Promise<FeedbackAuthState> {
	const config = getFeedbackConfig()
	const user = AuthService.getInstance().getInfo().user
	const accountDisplay = user?.displayName?.trim() || user?.email?.trim() || ""
	const accountEmail = user?.email?.trim() || ""
	return FeedbackAuthState.create({
		authenticated: FeedbackService.getInstance().isAuthenticated(),
		hubConfigured: config !== null,
		usingMock: config?.useMock === true,
		error: "",
		accountDisplay,
		accountEmail,
	})
}
