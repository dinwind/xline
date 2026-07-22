import { StorybookThemes } from "../../.storybook/themes"
import { PLATFORM_CONFIG } from "../config/platform.config"

type GrpcRequestPayload = {
	service: string
	method: string
	message?: unknown
	request_id: string
	is_streaming: boolean
}

type StreamSubscription = {
	service: string
	method: string
}

const streamingSubscriptions = new Map<string, StreamSubscription>()

const MOCK_USER = {
	uid: "dev-user-001",
	email: "dev.user@example.com",
	displayName: "Dev User",
	appBaseUrl: "https://app.cline.bot",
}

const MOCK_AXGATE_SUMMARY = {
	subject: "dev-user@example.com",
	roles: ["developer", "axgate-user"],
	providers: [{ name: "aliyun", model: "qwen3.7-plus", enabled: true }],
	models: ["ax_auto", "ax_aliyun_deepseek-v4-flash", "ax_aliyun_glm-5.2", "ax_aliyun_kimi-k2.7-code"],
	quotaLimit: 100_000,
	quotaUsageJson: JSON.stringify({ "ide-dev-user@example.com": 42_500 }),
	healthStatus: "ok",
	installationId: "550e8400-e29b-41d4-a716-446655440000",
	clientVersion: "0.2.0",
	deviceStatus: "pending",
	minimumVersion: "0.2.0",
	deviceEnforcement: "observe",
	versionEnforcement: "observe",
}

function devParams() {
	return new URLSearchParams(window.location.search)
}

function wantsAccountView() {
	return devParams().get("view") === "account"
}

function wantsLoginView() {
	return devParams().has("login") || devParams().get("auth") === "none"
}

function wantsAxgate() {
	const params = devParams()
	if (params.get("axgate") === "0") {
		return false
	}
	// Default on in browser dev so Account + AxGate chat UI are previewable.
	return params.get("axgate") !== "0"
}

declare const __NODE_PLATFORM__: string | undefined

function devPlatform(): string {
	if (typeof __NODE_PLATFORM__ === "string") {
		return __NODE_PLATFORM__
	}
	if (typeof navigator !== "undefined") {
		const ua = navigator.userAgent.toLowerCase()
		if (ua.includes("win")) {
			return "win32"
		}
		if (ua.includes("mac")) {
			return "darwin"
		}
	}
	return "linux"
}

function buildMockStateJson(): string {
	return JSON.stringify({
		version: "0.0.0-dev",
		clineMessages: [],
		taskHistory: [],
		welcomeViewCompleted: true,
		shouldShowAnnouncement: false,
		isNewUser: false,
		axgateAuthEnabled: wantsAxgate(),
		environment: "selfHosted",
		platform: devPlatform(),
		telemetrySetting: "disabled",
		distinctId: "dev-preview",
	})
}

function dispatchGrpcResponse(requestId: string, message: Record<string, unknown>, isStreaming: boolean) {
	window.dispatchEvent(
		new MessageEvent("message", {
			data: {
				type: "grpc_response",
				grpc_response: {
					request_id: requestId,
					message,
					is_streaming: isStreaming,
				},
			},
		}),
	)
}

function scheduleAccountNavigation() {
	// Account navigation is handled when subscribeToAccountButtonClicked registers.
}

function handleStreamingRequest(request: GrpcRequestPayload) {
	const route = `${request.service}.${request.method}`
	streamingSubscriptions.set(request.request_id, { service: request.service, method: request.method })

	switch (route) {
		case "cline.StateService.subscribeToState":
			dispatchGrpcResponse(request.request_id, { stateJson: buildMockStateJson() }, true)
			scheduleAccountNavigation()
			break
		case "cline.AccountService.subscribeToAuthStatusUpdate":
			if (!wantsLoginView()) {
				dispatchGrpcResponse(request.request_id, { user: MOCK_USER }, true)
			}
			break
		case "cline.UiService.subscribeToAccountButtonClicked":
			if (wantsAccountView()) {
				// Open account as soon as the webview subscribes (same as clicking the toolbar button).
				window.setTimeout(() => dispatchGrpcResponse(request.request_id, {}, true), 0)
			}
			break
		default:
			break
	}
}

function handleUnaryRequest(request: GrpcRequestPayload) {
	const route = `${request.service}.${request.method}`

	switch (route) {
		case "cline.UiService.initializeWebview":
		case "cline.AccountService.accountLogoutClicked":
		case "cline.AccountService.getUserOrganizations":
			dispatchGrpcResponse(request.request_id, {}, false)
			break
		case "cline.StateService.getAvailableTerminalProfiles":
			dispatchGrpcResponse(request.request_id, { profiles: [] }, false)
			break
		case "cline.AccountService.getAxgateAccountSummary":
			dispatchGrpcResponse(request.request_id, MOCK_AXGATE_SUMMARY, false)
			break
		case "cline.AccountService.refreshAxgateDeviceStatus":
			dispatchGrpcResponse(
				request.request_id,
				{
					installationId: MOCK_AXGATE_SUMMARY.installationId,
					clientVersion: MOCK_AXGATE_SUMMARY.clientVersion,
					deviceStatus: MOCK_AXGATE_SUMMARY.deviceStatus,
					minimumVersion: MOCK_AXGATE_SUMMARY.minimumVersion,
					deviceEnforcement: MOCK_AXGATE_SUMMARY.deviceEnforcement,
					versionEnforcement: MOCK_AXGATE_SUMMARY.versionEnforcement,
				},
				false,
			)
			break
		case "cline.AccountService.accountLoginWithCredentials":
			dispatchGrpcResponse(request.request_id, { value: "Signed in (dev mock)." }, false)
			window.setTimeout(() => {
				for (const [requestId, subscription] of streamingSubscriptions) {
					if (
						subscription.service === "cline.AccountService" &&
						subscription.method === "subscribeToAuthStatusUpdate"
					) {
						dispatchGrpcResponse(requestId, { user: MOCK_USER }, true)
					}
				}
			}, 300)
			break
		default:
			dispatchGrpcResponse(request.request_id, {}, false)
			break
	}
}

function handleGrpcRequest(raw: GrpcRequestPayload) {
	if (raw.is_streaming) {
		handleStreamingRequest(raw)
		return
	}
	handleUnaryRequest(raw)
}

function applyDevTheme() {
	const theme = devParams().get("theme") === "light" ? StorybookThemes.light : StorybookThemes.dark
	const extras: Record<string, string> = {
		"--vscode-editorWidget-background": theme["--vscode-sideBar-background"],
	}

	const root = document.documentElement
	for (const [property, value] of Object.entries({ ...theme, ...extras })) {
		root.style.setProperty(property, value)
	}

	document.body.style.backgroundColor = theme["--vscode-sideBar-background"]
	document.body.style.color = theme["--vscode-foreground"]
	document.body.style.fontFamily = theme["--vscode-font-family"]
	document.body.style.fontSize = theme["--vscode-font-size"]
}

function showDevBanner() {
	const banner = document.createElement("div")
	banner.id = "axline-dev-banner"
	banner.textContent = "Browser dev preview — mock extension host active. Try ?view=account, ?view=account&login, ?theme=light"
	banner.style.cssText = [
		"position:fixed",
		"top:0",
		"left:0",
		"right:0",
		"z-index:99999",
		"padding:4px 10px",
		"font:11px/1.4 var(--vscode-font-family,sans-serif)",
		"color:var(--vscode-foreground,#ccc)",
		"background:var(--vscode-editorWidget-background,#333)",
		"border-bottom:1px solid var(--vscode-panel-border,#555)",
		"text-align:center",
	].join(";")
	document.body.prepend(banner)
}

export function installMockExtensionHost() {
	applyDevTheme()
	showDevBanner()

	const originalPostMessage = PLATFORM_CONFIG.postMessage
	PLATFORM_CONFIG.postMessage = (message: { type?: string; grpc_request?: GrpcRequestPayload }) => {
		if (message?.type === "grpc_request" && message.grpc_request) {
			window.setTimeout(() => handleGrpcRequest(message.grpc_request!), 0)
			return
		}
		if (message?.type === "grpc_request_cancel") {
			return
		}
		originalPostMessage(message)
	}

	console.info("[dev] Mock extension host installed.", {
		view: devParams().get("view") ?? "chat",
		login: wantsLoginView(),
		axgate: wantsAxgate(),
	})
}
