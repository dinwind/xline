import { AxgateAccountSummary, AxgateProviderSummary } from "@shared/proto/cline/account"
import type { EmptyRequest } from "@shared/proto/cline/common"
import { AxgateAccountService } from "@/sdk/axgate/account-service"
import { isAxgateAuthEnabled } from "@/sdk/axgate/config"
import { Logger } from "@/shared/services/Logger"
import type { Controller } from "../index"

export async function getAxgateAccountSummary(_controller: Controller, _request: EmptyRequest): Promise<AxgateAccountSummary> {
	if (!isAxgateAuthEnabled()) {
		throw new Error("AxGate account summary is only available when AxGate is configured")
	}

	try {
		const summary = await AxgateAccountService.getInstance().fetchAccountSummary()
		return AxgateAccountSummary.create({
			subject: summary.subject,
			roles: summary.roles,
			providers: summary.providers.map((provider) =>
				AxgateProviderSummary.create({
					name: provider.name,
					model: provider.model,
					enabled: provider.enabled,
				}),
			),
			models: summary.models,
			quotaLimit: summary.quotaLimit,
			quotaUsageJson: summary.quotaUsageJson,
			healthStatus: summary.healthStatus,
		})
	} catch (error) {
		Logger.error(`Failed to fetch AxGate account summary: ${error}`)
		throw error
	}
}
