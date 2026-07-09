import { fetchAxgateSession, stripAxgateTokenPrefix } from "@cline/core"
import { AuthService } from "../auth-service"
import {
	type AxgateProviderSummary,
	filterEnabledProviders,
	filterQuotaUsageForSubject,
	mapProviderSummary,
} from "./account-utils"
import { getAxgateConfig, toAxgateAuthConfig } from "./config"

export type { AxgateProviderSummary } from "./account-utils"

export type AxgateConsoleSummary = {
	health?: { status?: string }
	quota?: { limit_per_project?: number; usage?: Record<string, unknown> }
}

export type AxgateAccountSummary = {
	subject: string
	roles: string[]
	providers: AxgateProviderSummary[]
	models: string[]
	quotaLimit?: number
	quotaUsageJson?: string
	healthStatus?: string
}

const DEFAULT_HTTP_TIMEOUT_MS = 30_000

async function parseErrorMessage(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as {
			detail?: string | { message?: string; code?: string }
			message?: string
		}
		if (typeof body.detail === "string") {
			return body.detail
		}
		if (body.detail && typeof body.detail === "object") {
			return body.detail.message || body.detail.code || response.statusText
		}
		return body.message || response.statusText
	} catch {
		return response.statusText || "Request failed"
	}
}

export class AxgateAccountService {
	private static instance: AxgateAccountService

	public static getInstance(): AxgateAccountService {
		if (!AxgateAccountService.instance) {
			AxgateAccountService.instance = new AxgateAccountService()
		}
		return AxgateAccountService.instance
	}

	private async getBearerToken(): Promise<string> {
		const token = await AuthService.getInstance().getAuthToken()
		if (!token) {
			throw new Error("Not authenticated")
		}
		return stripAxgateTokenPrefix(token)
	}

	private async authenticatedFetch<T>(path: string): Promise<T> {
		const config = getAxgateConfig()
		if (!config) {
			throw new Error("AxGate is not configured")
		}

		const token = await this.getBearerToken()
		const url = `${config.baseUrl}${path}`
		const response = await fetch(url, {
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
		})

		if (!response.ok) {
			throw new Error(await parseErrorMessage(response))
		}

		return (await response.json()) as T
	}

	async fetchConsoleSummary(): Promise<AxgateConsoleSummary> {
		return this.authenticatedFetch<AxgateConsoleSummary>("/api/console/summary")
	}

	private async fetchConsoleSummaryWithToken(token: string): Promise<AxgateConsoleSummary> {
		const config = getAxgateConfig()
		if (!config) {
			throw new Error("AxGate is not configured")
		}

		const url = `${config.baseUrl}/api/console/summary`
		const response = await fetch(url, {
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
		})

		if (!response.ok) {
			throw new Error(await parseErrorMessage(response))
		}

		const data = (await response.json()) as AxgateConsoleSummary & {
			models?: string[]
			providers?: Array<{ name: string; model?: string; enabled?: boolean }>
		}

		// Console summary may include gateway-wide models/providers; ignore them here.
		return {
			health: data.health,
			quota: data.quota,
		}
	}

	async fetchProviders(): Promise<AxgateProviderSummary[]> {
		const token = await this.getBearerToken()
		return this.fetchProvidersWithToken(token)
	}

	private async fetchProvidersWithToken(token: string): Promise<AxgateProviderSummary[]> {
		const config = getAxgateConfig()
		if (!config) {
			throw new Error("AxGate is not configured")
		}

		const url = `${config.baseUrl}/api/providers`
		const response = await fetch(url, {
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
		})

		if (!response.ok) {
			throw new Error(await parseErrorMessage(response))
		}

		const data = (await response.json()) as
			| Array<{ name: string; model?: string; enabled?: boolean }>
			| { providers?: Array<{ name: string; model?: string; enabled?: boolean }> }

		const providers = Array.isArray(data) ? data : (data.providers ?? [])
		return filterEnabledProviders(providers.map(mapProviderSummary))
	}

	private async fetchAllowedModelsWithToken(token: string): Promise<string[]> {
		const config = getAxgateConfig()
		if (!config) {
			throw new Error("AxGate is not configured")
		}

		const url = `${config.baseUrl}/v1/models`
		const response = await fetch(url, {
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
		})

		if (!response.ok) {
			throw new Error(await parseErrorMessage(response))
		}

		const data = (await response.json()) as { data?: Array<{ id?: string }> }
		return (data.data ?? []).map((model) => model.id?.trim()).filter((modelId): modelId is string => Boolean(modelId))
	}

	async fetchAllowedModels(): Promise<string[]> {
		const token = await this.getBearerToken()
		return this.fetchAllowedModelsWithToken(token)
	}

	async fetchAccountSummary(): Promise<AxgateAccountSummary> {
		const token = await this.getBearerToken()
		return this.fetchAccountSummaryWithToken(token)
	}

	async fetchAccountSummaryWithToken(token: string): Promise<AxgateAccountSummary> {
		const config = getAxgateConfig()
		if (!config) {
			throw new Error("AxGate is not configured")
		}

		const [session, summary, providers, models] = await Promise.all([
			fetchAxgateSession(toAxgateAuthConfig(config), token),
			this.fetchConsoleSummaryWithToken(token).catch(() => ({}) as AxgateConsoleSummary),
			this.fetchProvidersWithToken(token).catch(() => [] as AxgateProviderSummary[]),
			this.fetchAllowedModelsWithToken(token).catch(() => [] as string[]),
		])

		const principal = session.principal
		const subject = principal?.subject ?? ""
		const filteredQuotaUsage = filterQuotaUsageForSubject(summary.quota?.usage, subject)

		return {
			subject,
			roles: principal?.roles ?? [],
			providers,
			models,
			quotaLimit: summary.quota?.limit_per_project,
			quotaUsageJson: filteredQuotaUsage !== undefined ? JSON.stringify(filteredQuotaUsage) : undefined,
			healthStatus: summary.health?.status,
		}
	}
}
