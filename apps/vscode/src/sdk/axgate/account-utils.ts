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
		enabled: provider.enabled === true,
	}
}

export function filterEnabledProviders(providers: AxgateProviderSummary[]): AxgateProviderSummary[] {
	return providers.filter((provider) => provider.enabled)
}
