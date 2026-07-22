import { ClineEndpoint } from "@/config"
import { isSecureEndpointUrl, migrateEndpointUrl } from "@/shared/axline-dir"

export type FeedbackConfig = {
	authNexusBaseUrl: string
	appId: string
	useMock: boolean
}

const FEEDBACK_APP_ID = "axline"

/**
 * Single-source AuthNexus base URL (R-7): same key as private update (`authNexusBaseUrl`).
 * Mock is opt-in only — never present fake submit success to real users (AX-F-01..10).
 */
export function getFeedbackConfig(): FeedbackConfig | null {
	const useMock = process.env.AXLINE_FEEDBACK_MOCK === "1" || process.env.AXLINE_FEEDBACK_MOCK === "true"
	if (useMock) {
		return {
			authNexusBaseUrl: "mock://feedback",
			appId: FEEDBACK_APP_ID,
			useMock: true,
		}
	}

	const fromEndpoint = ClineEndpoint.getEndpointsExtension()
	const raw = process.env.AXLINE_AUTHNEXUS_BASE_URL?.trim() || fromEndpoint?.authNexusBaseUrl?.trim() || ""
	const authNexusBaseUrl = raw ? migrateEndpointUrl(raw).replace(/\/$/, "") : ""

	if (!authNexusBaseUrl) {
		return null
	}

	return {
		authNexusBaseUrl,
		appId: process.env.AXLINE_FEEDBACK_APP_ID?.trim() || FEEDBACK_APP_ID,
		useMock: false,
	}
}

/**
 * Production must use HTTPS (SEC-03 / client plan §6.1).
 * Localhost HTTP is allowed for development. Remote plain HTTP is rejected.
 */
export function assertFeedbackBaseUrlSecure(baseUrl: string): void {
	if (baseUrl.toLowerCase().startsWith("mock://")) {
		return
	}
	if (isSecureEndpointUrl(baseUrl)) {
		return
	}
	throw new Error("Production authNexusBaseUrl must use HTTPS for Feedback Hub")
}

export function isFeedbackConfigured(): boolean {
	return getFeedbackConfig() !== null
}
