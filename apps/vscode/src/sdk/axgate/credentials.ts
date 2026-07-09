import { getProviderSettingsManager } from "../provider-migration"
import { getAxgateConfig } from "./config"

const STORAGE_PROVIDER_ID = "axgate"
const AXGATE_TOKEN_PREFIX = "axgate:"

function stripAxgateTokenPrefix(accessToken: string): string {
	const token = accessToken.trim()
	return token.toLowerCase().startsWith(AXGATE_TOKEN_PREFIX) ? token.slice(AXGATE_TOKEN_PREFIX.length) : token
}

export function readAxgateCredentials(): {
	accessToken: string
	expiresAt?: number
	accountId?: string
} | null {
	try {
		const manager = getProviderSettingsManager()
		const settings = manager.getProviderSettings(STORAGE_PROVIDER_ID)
		if (!settings?.auth?.accessToken) {
			return null
		}

		return {
			accessToken: stripAxgateTokenPrefix(settings.auth.accessToken),
			expiresAt: (settings.auth as { expiresAt?: number }).expiresAt,
			accountId: settings.auth.accountId,
		}
	} catch {
		return null
	}
}

export function writeAxgateCredentials(credentials: { accessToken: string; expiresAt?: number; accountId?: string }): void {
	const manager = getProviderSettingsManager()
	const existing = manager.getProviderSettings(STORAGE_PROVIDER_ID)
	const token = credentials.accessToken.trim()
	const accessToken = token.toLowerCase().startsWith(AXGATE_TOKEN_PREFIX) ? token : `${AXGATE_TOKEN_PREFIX}${token}`

	const auth: Record<string, unknown> = {
		...(existing?.auth ?? {}),
		accessToken,
		refreshToken: token,
		accountId: credentials.accountId,
	}
	const config = getAxgateConfig()
	if (config?.authAppId) {
		auth.appId = config.authAppId
	}
	if (credentials.expiresAt !== undefined) {
		auth.expiresAt = credentials.expiresAt
	}

	manager.saveProviderSettings(
		{
			...(existing ?? { provider: STORAGE_PROVIDER_ID }),
			provider: STORAGE_PROVIDER_ID,
			auth: auth as { accessToken?: string; refreshToken?: string; accountId?: string },
		},
		{ tokenSource: "oauth", setLastUsed: true },
	)
}

export function clearAxgateCredentials(): void {
	const manager = getProviderSettingsManager()
	const existing = manager.getProviderSettings(STORAGE_PROVIDER_ID)
	if (!existing) {
		return
	}

	manager.saveProviderSettings(
		{
			...existing,
			provider: STORAGE_PROVIDER_ID,
			auth: undefined,
		},
		{ tokenSource: "manual" },
	)
}
