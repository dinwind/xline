export type AxgateProviderInput = {
	name: string
	model?: string
	enabled?: boolean
}

export type AxgateProviderSummary = {
	name: string
	model?: string
	enabled: boolean
}

export type ProviderWithPermittedModels = {
	provider: AxgateProviderSummary
	models: string[]
}

export type GroupedProviderModels = {
	providers: ProviderWithPermittedModels[]
	unassignedModels: string[]
}

const AX_AUTO_MODEL_ID = "ax_auto"
const AX_MODEL_PREFIX = "ax_"

export function toIdeProjectId(subject: string): string {
	return `ide-${subject}`
}

export function filterQuotaUsageForSubject(
	usage: Record<string, unknown> | undefined,
	subject: string,
): Record<string, unknown> | undefined {
	if (!usage || !subject) {
		return undefined
	}

	const projectId = toIdeProjectId(subject)
	if (!(projectId in usage)) {
		return {}
	}

	return { [projectId]: usage[projectId] }
}

export function hasQuotaUsageEntries(usage: Record<string, unknown> | undefined): boolean {
	return Boolean(usage && Object.keys(usage).length > 0)
}

export function mapProviderSummary(provider: AxgateProviderInput): AxgateProviderSummary {
	return {
		name: provider.name,
		model: provider.model,
		enabled: provider.enabled !== false,
	}
}

export function extractProvidersFromResponse(data: unknown): AxgateProviderInput[] {
	if (Array.isArray(data)) {
		return data as AxgateProviderInput[]
	}
	if (data && typeof data === "object") {
		const payload = data as { data?: unknown; providers?: unknown }
		if (Array.isArray(payload.data)) {
			return payload.data as AxgateProviderInput[]
		}
		if (Array.isArray(payload.providers)) {
			return payload.providers as AxgateProviderInput[]
		}
	}
	return []
}

export function parseProviderNameFromModelId(modelId: string, knownProviders: string[]): string | null {
	const normalized = modelId.trim()
	if (!normalized || normalized === AX_AUTO_MODEL_ID || normalized === "auto") {
		return null
	}
	if (!normalized.startsWith(AX_MODEL_PREFIX)) {
		return null
	}

	const remainder = normalized.slice(AX_MODEL_PREFIX.length)
	for (const providerName of [...knownProviders].sort((left, right) => right.length - left.length)) {
		const marker = `${providerName}_`
		if (remainder.startsWith(marker)) {
			return providerName
		}
	}
	return null
}

export function groupModelsByProvider(models: string[], providers: AxgateProviderSummary[]): GroupedProviderModels {
	const providerNames = providers.map((provider) => provider.name)
	const modelsByProvider = new Map<string, string[]>()
	const unassignedModels: string[] = []

	for (const modelId of models) {
		const providerName = parseProviderNameFromModelId(modelId, providerNames)
		if (!providerName) {
			unassignedModels.push(modelId)
			continue
		}
		const existing = modelsByProvider.get(providerName) ?? []
		existing.push(modelId)
		modelsByProvider.set(providerName, existing)
	}

	return {
		providers: providers.map((provider) => ({
			provider,
			models: modelsByProvider.get(provider.name) ?? [],
		})),
		unassignedModels,
	}
}

export function filterEnabledProviders(providers: AxgateProviderSummary[]): AxgateProviderSummary[] {
	return providers.filter((provider) => provider.enabled)
}
