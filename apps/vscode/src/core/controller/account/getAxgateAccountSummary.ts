import { AxgateAccountSummary, AxgateProviderSummary } from "@shared/proto/cline/account"
import type { EmptyRequest } from "@shared/proto/cline/common"
import { ExtensionRegistryInfo } from "@/registry"
import { AxgateAccountService } from "@/sdk/axgate/account-service"
import { isAxgateAuthEnabled } from "@/sdk/axgate/config"
import { getInstallationId } from "@/services/identity/installation-id"
import { Logger } from "@/shared/services/Logger"
import type { Controller } from "../index"

function mapDeviceFields(summary: Awaited<ReturnType<AxgateAccountService["fetchAccountSummary"]>>) {
	return {
		installationId: summary.installationId ?? getInstallationId() ?? "",
		clientVersion: summary.clientVersion ?? ExtensionRegistryInfo.version,
		deviceStatus: summary.deviceStatus ?? "unknown",
		minimumVersion: summary.minimumVersion,
		deviceEnforcement: summary.deviceEnforcement,
		versionEnforcement: summary.versionEnforcement,
		message: summary.deviceMessage,
	}
}

export async function getAxgateAccountSummary(_controller: Controller, _request: EmptyRequest): Promise<AxgateAccountSummary> {
	if (!isAxgateAuthEnabled()) {
		throw new Error("AxGate account summary is only available when AxGate is configured")
	}

	try {
		const summary = await AxgateAccountService.getInstance().fetchAccountSummary()
		const device = mapDeviceFields(summary)
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
			installationId: device.installationId,
			clientVersion: device.clientVersion,
			deviceStatus: device.deviceStatus,
			minimumVersion: device.minimumVersion,
			deviceEnforcement: device.deviceEnforcement,
			versionEnforcement: device.versionEnforcement,
			deviceMessage: device.message,
		})
	} catch (error) {
		Logger.error(`Failed to fetch AxGate account summary: ${error}`)
		throw error
	}
}
