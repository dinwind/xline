import { StateManager } from "@/core/storage/StateManager"
import { Logger } from "@/shared/services/Logger"
import { getProviderSettingsManager } from "../provider-migration"
import { AxgateAccountService } from "./account-service"
import { getAxgateConfig } from "./config"

const STORAGE_PROVIDER_ID = "axgate"
const AXGATE_TOKEN_PREFIX = "axgate:"
const DEFAULT_MODEL_ID = "auto"

function resolveAllowedModelId(currentModel: string | undefined, allowedModels: string[]): string {
	if (currentModel && allowedModels.includes(currentModel)) {
		return currentModel
	}
	if (allowedModels.includes(DEFAULT_MODEL_ID)) {
		return DEFAULT_MODEL_ID
	}
	return allowedModels[0] ?? DEFAULT_MODEL_ID
}

function toStoredAccessToken(accessToken: string): string {
	const token = accessToken.trim()
	return token.toLowerCase().startsWith(AXGATE_TOKEN_PREFIX) ? token : `${AXGATE_TOKEN_PREFIX}${token}`
}

async function fetchAllowedModels(accessToken: string): Promise<string[]> {
	try {
		return await AxgateAccountService.getInstance()
			.fetchAccountSummaryWithToken(accessToken)
			.then((summary) => summary.models)
	} catch (error) {
		Logger.warn(`[AxgateAutoConfig] Failed to fetch allowed models: ${error}`)
		return []
	}
}

function syncAxgateApiConfiguration(modelId: string): void {
	try {
		const stateManager = StateManager.get()
		const current = stateManager.getApiConfiguration()
		stateManager.setApiConfiguration({
			...current,
			planModeApiProvider: "axgate",
			actModeApiProvider: "axgate",
			planModeApiModelId: modelId,
			actModeApiModelId: modelId,
		})
	} catch (error) {
		Logger.warn(`[AxgateAutoConfig] Failed to sync API configuration: ${error}`)
	}
}

export async function configureAxgateProviderAfterLogin(accessToken: string): Promise<void> {
	const config = getAxgateConfig()
	if (!config) {
		return
	}

	const manager = getProviderSettingsManager()
	const existing = manager.getProviderSettings(STORAGE_PROVIDER_ID)
	const allowedModels = await fetchAllowedModels(accessToken)
	const modelId =
		allowedModels.length > 0
			? resolveAllowedModelId(existing?.model?.trim(), allowedModels)
			: existing?.model?.trim() || DEFAULT_MODEL_ID
	const storedAccessToken = toStoredAccessToken(accessToken)

	manager.saveProviderSettings(
		{
			...(existing ?? { provider: STORAGE_PROVIDER_ID }),
			provider: STORAGE_PROVIDER_ID,
			baseUrl: `${config.baseUrl}/v1`,
			model: modelId,
			auth: {
				...(existing?.auth ?? {}),
				accessToken: storedAccessToken,
				refreshToken: accessToken.trim(),
				accountId: existing?.auth?.accountId,
				appId: config.authAppId,
			},
		},
		{ tokenSource: "oauth", setLastUsed: true },
	)

	syncAxgateApiConfiguration(modelId)
}

export async function reconcileAxgateModelSelection(accessToken?: string): Promise<void> {
	const config = getAxgateConfig()
	if (!config) {
		return
	}

	const manager = getProviderSettingsManager()
	const existing = manager.getProviderSettings(STORAGE_PROVIDER_ID)
	if (!existing) {
		return
	}

	const token =
		accessToken?.trim() || existing.auth?.accessToken?.replace(/^axgate:/i, "") || existing.auth?.refreshToken?.trim()
	if (!token) {
		return
	}

	const allowedModels = await fetchAllowedModels(token)
	if (allowedModels.length === 0) {
		return
	}

	const modelId = resolveAllowedModelId(existing.model?.trim(), allowedModels)
	if (modelId === existing.model?.trim()) {
		return
	}

	manager.saveProviderSettings(
		{
			...existing,
			provider: STORAGE_PROVIDER_ID,
			model: modelId,
		},
		{ tokenSource: "oauth", setLastUsed: false },
	)
	syncAxgateApiConfiguration(modelId)
}
