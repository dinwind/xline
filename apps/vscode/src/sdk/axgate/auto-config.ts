import { StateManager } from "@/core/storage/StateManager"
import { Logger } from "@/shared/services/Logger"
import { getProviderSettingsManager } from "../provider-migration"
import { AxgateAccountService } from "./account-service"
import { getAxgateConfig } from "./config"
import { type AxgateModeDefaults, resolveAxgateBootstrapModels } from "./mode-defaults"

const STORAGE_PROVIDER_ID = "axgate"
const AXGATE_TOKEN_PREFIX = "axgate:"
const DEFAULT_MODEL_ID = "auto"

function toStoredAccessToken(accessToken: string): string {
	const token = accessToken.trim()
	return token.toLowerCase().startsWith(AXGATE_TOKEN_PREFIX) ? token : `${AXGATE_TOKEN_PREFIX}${token}`
}

async function fetchAccountBootstrap(accessToken: string): Promise<{
	models: string[]
	modeDefaults: AxgateModeDefaults
}> {
	try {
		const summary = await AxgateAccountService.getInstance().fetchAccountSummaryWithToken(accessToken)
		return {
			models: summary.models,
			modeDefaults: summary.modeDefaults,
		}
	} catch (error) {
		Logger.warn(`[AxgateAutoConfig] Failed to fetch account bootstrap: ${error}`)
		return { models: [], modeDefaults: {} }
	}
}

function syncAxgateApiConfiguration(actModelId: string, planModelId: string): void {
	try {
		const stateManager = StateManager.get()
		const current = stateManager.getApiConfiguration()
		stateManager.setApiConfiguration({
			...current,
			planModeApiProvider: "axgate",
			actModeApiProvider: "axgate",
			planModeApiModelId: planModelId,
			actModeApiModelId: actModelId,
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
	const { models: allowedModels, modeDefaults } = await fetchAccountBootstrap(accessToken)
	const { actModelId, planModelId } =
		allowedModels.length > 0
			? resolveAxgateBootstrapModels(modeDefaults, allowedModels, existing?.model?.trim())
			: {
					actModelId: existing?.model?.trim() || DEFAULT_MODEL_ID,
					planModelId: existing?.model?.trim() || DEFAULT_MODEL_ID,
				}
	const storedAccessToken = toStoredAccessToken(accessToken)

	manager.saveProviderSettings(
		{
			...(existing ?? { provider: STORAGE_PROVIDER_ID }),
			provider: STORAGE_PROVIDER_ID,
			baseUrl: `${config.baseUrl}/v1`,
			model: actModelId,
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

	syncAxgateApiConfiguration(actModelId, planModelId)
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

	const { models: allowedModels, modeDefaults } = await fetchAccountBootstrap(token)
	if (allowedModels.length === 0) {
		return
	}

	const { actModelId, planModelId } = resolveAxgateBootstrapModels(modeDefaults, allowedModels, existing.model?.trim())
	const apiConfig = StateManager.get().getApiConfiguration()
	const currentActModelId = apiConfig.actModeApiModelId
	const currentPlanModelId = apiConfig.planModeApiModelId

	if (actModelId === existing.model?.trim() && actModelId === currentActModelId && planModelId === currentPlanModelId) {
		return
	}

	manager.saveProviderSettings(
		{
			...existing,
			provider: STORAGE_PROVIDER_ID,
			model: actModelId,
		},
		{ tokenSource: "oauth", setLastUsed: false },
	)
	syncAxgateApiConfiguration(actModelId, planModelId)
}
