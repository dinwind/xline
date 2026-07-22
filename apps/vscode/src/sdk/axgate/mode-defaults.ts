export type AxgateModeDefaults = Partial<Record<"auto" | "plan" | "act", string>>

export function resolveAllowedModelId(
	currentModel: string | undefined,
	allowedModels: string[],
	defaultModelId = "auto",
): string {
	if (currentModel && allowedModels.includes(currentModel)) {
		return currentModel
	}
	if (allowedModels.includes(defaultModelId)) {
		return defaultModelId
	}
	return allowedModels[0] ?? defaultModelId
}

export function resolveModeModelId(
	modeDefaults: AxgateModeDefaults,
	mode: keyof AxgateModeDefaults,
	allowedModels: string[],
	fallback: string | undefined,
	defaultModelId = "auto",
): string {
	const preferred = modeDefaults[mode]?.trim()
	if (preferred && allowedModels.includes(preferred)) {
		return preferred
	}
	return resolveAllowedModelId(fallback, allowedModels, defaultModelId)
}

export function resolveAxgateBootstrapModels(
	modeDefaults: AxgateModeDefaults,
	allowedModels: string[],
	existingModel: string | undefined,
): { actModelId: string; planModelId: string } {
	const actModelId = resolveModeModelId(modeDefaults, "auto", allowedModels, existingModel)
	const planModelId = resolveModeModelId(modeDefaults, "plan", allowedModels, actModelId)
	return { actModelId, planModelId }
}
