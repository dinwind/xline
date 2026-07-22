import { parseAxgateErrorResponse, stripAxgateTokenPrefix } from "@cline/core"
import { ExtensionRegistryInfo } from "@/registry"
import { getInstallationId } from "@/services/identity/installation-id"
import { AuthService } from "../auth-service"
import {
	type AxgateProviderSummary,
	extractProvidersFromResponse,
	filterQuotaUsageForSubject,
	mapProviderSummary,
} from "./account-utils"
import { buildAxgateRequestHeaders } from "./client-identity"
import { getAxgateConfig } from "./config"
import { type AxgateDeviceStatusSnapshot, fetchAxgateDeviceStatus } from "./device-service"
import type { AxgateModeDefaults } from "./mode-defaults"

export type { AxgateProviderSummary } from "./account-utils"
export type { AxgateModeDefaults } from "./mode-defaults"

type AxgateAccountSummaryResponse = {
	health?: { status?: string }
	models?: string[]
	mode_defaults?: Partial<Record<"auto" | "plan" | "act", string>>
	providers?: Array<{ name: string; model?: string; enabled?: boolean }>
	quota?: { limit_per_project?: number; usage?: Record<string, unknown> }
	principal?: { subject?: string; roles?: string[] }
}

export type AxgateAccountSummary = {
	subject: string
	roles: string[]
	providers: AxgateProviderSummary[]
	models: string[]
	modeDefaults: AxgateModeDefaults
	quotaLimit?: number
	quotaUsageJson?: string
	healthStatus?: string
	installationId?: string
	clientVersion?: string
	deviceStatus?: string
	minimumVersion?: string
	deviceEnforcement?: string
	versionEnforcement?: string
	deviceMessage?: string
}

const DEFAULT_HTTP_TIMEOUT_MS = 30_000

async function throwAxgateResponseError(response: Response): Promise<never> {
	throw await parseAxgateErrorResponse(response)
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

	async fetchAccountSummary(): Promise<AxgateAccountSummary> {
		const token = await this.getBearerToken()
		return this.fetchAccountSummaryWithToken(token)
	}

	async fetchAccountSummaryWithToken(token: string): Promise<AxgateAccountSummary> {
		const config = getAxgateConfig()
		if (!config) {
			throw new Error("AxGate is not configured")
		}

		const url = `${config.baseUrl}/api/account/summary`
		const headers = await buildAxgateRequestHeaders({ Authorization: `Bearer ${token}` })
		const [summaryResponse, deviceStatus] = await Promise.all([
			fetch(url, {
				method: "GET",
				headers,
				signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
			}),
			fetchAxgateDeviceStatus(token),
		])

		if (!summaryResponse.ok) {
			await throwAxgateResponseError(summaryResponse)
		}

		const summary = (await summaryResponse.json()) as AxgateAccountSummaryResponse
		const subject = summary.principal?.subject ?? ""
		const filteredQuotaUsage = filterQuotaUsageForSubject(summary.quota?.usage, subject)
		const providers = extractProvidersFromResponse(summary.providers).map(mapProviderSummary)

		return {
			subject,
			roles: summary.principal?.roles ?? [],
			providers,
			models: summary.models ?? [],
			modeDefaults: summary.mode_defaults ?? {},
			quotaLimit: summary.quota?.limit_per_project,
			quotaUsageJson: filteredQuotaUsage !== undefined ? JSON.stringify(filteredQuotaUsage) : undefined,
			healthStatus: summary.health?.status,
			installationId: deviceStatus?.installationId ?? getInstallationId() ?? undefined,
			clientVersion: deviceStatus?.clientVersion ?? ExtensionRegistryInfo.version,
			deviceStatus: deviceStatus?.deviceStatus,
			minimumVersion: deviceStatus?.minimumVersion,
			deviceEnforcement: deviceStatus?.deviceEnforcement,
			versionEnforcement: deviceStatus?.versionEnforcement,
			deviceMessage: deviceStatus?.message,
		}
	}

	async refreshDeviceStatus(): Promise<AxgateDeviceStatusSnapshot> {
		const token = await this.getBearerToken()
		const deviceStatus = await fetchAxgateDeviceStatus(token)
		if (!deviceStatus) {
			throw new Error("Unable to refresh AxGate device status")
		}
		return deviceStatus
	}
}
