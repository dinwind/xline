import { type AxgateDeviceMeResponse, enrollAxgateDevice, fetchAxgateDeviceMe, isAxgateRequestError } from "@cline/core"
import { ExtensionRegistryInfo } from "@/registry"
import { readAxgateDeviceToken, writeAxgateDeviceToken } from "@/services/identity/device-token"
import { Logger } from "@/shared/services/Logger"
import { resolveAxgateClientIdentity, resolveAxgateClientIdentityWithToken } from "./client-identity"
import { getAxgateConfig, toAxgateAuthConfig } from "./config"

export type AxgateDeviceStatusSnapshot = {
	installationId: string
	clientVersion: string
	deviceStatus: string
	minimumVersion?: string
	deviceEnforcement?: string
	versionEnforcement?: string
	message?: string
}

function mapDeviceStatus(response: AxgateDeviceMeResponse): AxgateDeviceStatusSnapshot {
	return {
		installationId: response.installationId,
		clientVersion: response.lastSeenVersion ?? ExtensionRegistryInfo.version,
		deviceStatus: response.status,
		minimumVersion: response.minimumVersion,
		deviceEnforcement: response.deviceEnforcement,
		versionEnforcement: response.versionEnforcement,
	}
}

export async function fetchAxgateDeviceStatus(accessToken: string): Promise<AxgateDeviceStatusSnapshot | null> {
	const config = getAxgateConfig()
	if (!config) {
		return null
	}

	try {
		const statusIdentity = await resolveAxgateClientIdentityWithToken()
		const response = await fetchAxgateDeviceMe({
			...toAxgateAuthConfig(config),
			accessToken,
			clientIdentity: statusIdentity,
		})
		return mapDeviceStatus(response)
	} catch (error) {
		if (isAxgateRequestError(error)) {
			return {
				installationId: resolveAxgateClientIdentity().installationId,
				clientVersion: ExtensionRegistryInfo.version,
				deviceStatus: "unknown",
				message: error.message,
			}
		}
		Logger.warn("[AxgateDevice] Failed to fetch device status:", error)
		return null
	}
}

function isRegisteredDeviceStatus(status: string | undefined): boolean {
	return status === "pending" || status === "active" || status === "revoked"
}

export async function ensureAxgateDeviceRegistered(accessToken: string): Promise<AxgateDeviceStatusSnapshot | null> {
	const config = getAxgateConfig()
	if (!config) {
		return null
	}

	const authConfig = toAxgateAuthConfig(config)
	const existingToken = await readAxgateDeviceToken()

	try {
		if (!existingToken) {
			const existingStatus = await fetchAxgateDeviceStatus(accessToken)
			const alreadyRegistered = existingStatus !== null && isRegisteredDeviceStatus(existingStatus.deviceStatus)

			if (!alreadyRegistered) {
				const enrollIdentity = resolveAxgateClientIdentity()
				const enrolled = await enrollAxgateDevice({
					...authConfig,
					accessToken,
					clientIdentity: enrollIdentity,
				})

				if (enrolled.deviceToken?.trim()) {
					await writeAxgateDeviceToken(enrolled.deviceToken)
				}
			}
		}

		return await fetchAxgateDeviceStatus(accessToken)
	} catch (error) {
		if (isAxgateRequestError(error) && (error.status === 409 || error.code === "DEVICE_ALREADY_REGISTERED")) {
			Logger.warn("[AxgateDevice] Device already registered for this installation ID; fetching status")
			return await fetchAxgateDeviceStatus(accessToken)
		}

		if (isAxgateRequestError(error)) {
			Logger.warn("[AxgateDevice] Device registration failed:", error.message)
			return {
				installationId: resolveAxgateClientIdentity().installationId,
				clientVersion: ExtensionRegistryInfo.version,
				deviceStatus: "unknown",
				message: error.message,
			}
		}

		Logger.warn("[AxgateDevice] Device registration failed:", error)
		return null
	}
}
