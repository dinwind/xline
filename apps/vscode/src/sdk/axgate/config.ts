import { DEFAULT_AXLINE_AUTH_APP_ID } from "@cline/core"
import { ClineEndpoint } from "@/config"
import { isSecureEndpointUrl, migrateEndpointUrl } from "@/shared/axline-dir"

export type AxgateConfig = {
	baseUrl: string
	authAppId: string
}

export function getAxgateConfig(): AxgateConfig | null {
	const fromEndpoint = ClineEndpoint.getAxgateConfig?.()
	const raw =
		fromEndpoint?.axgateBaseUrl?.trim() || process.env.AXLINE_AXGATE_BASE_URL?.trim() || process.env.AXGATE_BASE_URL?.trim()

	if (!raw) {
		return null
	}

	const baseUrl = migrateEndpointUrl(raw).replace(/\/$/, "")
	if (!isSecureEndpointUrl(baseUrl)) {
		throw new Error(`axgateBaseUrl must use HTTPS (plain HTTP is only allowed for localhost). Got: "${raw}"`)
	}

	return {
		baseUrl,
		authAppId: fromEndpoint?.authAppId?.trim() || process.env.AXLINE_AUTH_APP_ID?.trim() || DEFAULT_AXLINE_AUTH_APP_ID,
	}
}

export function toAxgateAuthConfig(config: AxgateConfig): { baseUrl: string; appId: string } {
	return { baseUrl: config.baseUrl, appId: config.authAppId }
}

export function isAxgateAuthEnabled(): boolean {
	return getAxgateConfig() !== null
}
