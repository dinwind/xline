import { AxgateDeviceStatusSummary } from "@shared/proto/cline/account"
import type { EmptyRequest } from "@shared/proto/cline/common"
import { AxgateAccountService } from "@/sdk/axgate/account-service"
import { isAxgateAuthEnabled } from "@/sdk/axgate/config"
import { Logger } from "@/shared/services/Logger"
import type { Controller } from "../index"

export async function refreshAxgateDeviceStatus(
	_controller: Controller,
	_request: EmptyRequest,
): Promise<AxgateDeviceStatusSummary> {
	if (!isAxgateAuthEnabled()) {
		throw new Error("AxGate device status is only available when AxGate is configured")
	}

	try {
		const device = await AxgateAccountService.getInstance().refreshDeviceStatus()
		return AxgateDeviceStatusSummary.create({
			installationId: device.installationId,
			clientVersion: device.clientVersion,
			deviceStatus: device.deviceStatus,
			minimumVersion: device.minimumVersion,
			deviceEnforcement: device.deviceEnforcement,
			versionEnforcement: device.versionEnforcement,
			message: device.message,
		})
	} catch (error) {
		Logger.error(`Failed to refresh AxGate device status: ${error}`)
		throw error
	}
}
