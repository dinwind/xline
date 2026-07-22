import { ClineEndpoint } from "@/config"
import { isSecureEndpointUrl, migrateEndpointUrl } from "@/shared/axline-dir"
import type { AxlineUpdateConfig } from "./types"

export function getUpdateConfig(): AxlineUpdateConfig | null {
	const fromEndpoint = ClineEndpoint.getEndpointsExtension()
	const fromSecrets = ClineEndpoint.getUserSecrets()
	const rawAuthNexusBaseUrl = process.env.AXLINE_AUTHNEXUS_BASE_URL?.trim() || fromEndpoint?.authNexusBaseUrl?.trim()
	const updateAppId = process.env.AXLINE_UPDATE_APP_ID?.trim() || fromEndpoint?.updateAppId?.trim()
	const updateEnrollmentCode =
		process.env.AXLINE_UPDATE_ENROLLMENT_CODE?.trim() ||
		fromSecrets?.updateEnrollmentCode?.trim() ||
		fromEndpoint?.updateEnrollmentCode?.trim()

	if (!rawAuthNexusBaseUrl || !updateAppId || !updateEnrollmentCode) {
		return null
	}

	const authNexusBaseUrl = migrateEndpointUrl(rawAuthNexusBaseUrl).replace(/\/$/, "")
	if (!isSecureEndpointUrl(authNexusBaseUrl)) {
		throw new Error(
			`authNexusBaseUrl must use HTTPS (plain HTTP is only allowed for localhost). Got: "${rawAuthNexusBaseUrl}"`,
		)
	}

	return {
		authNexusBaseUrl,
		updateAppId,
		updateEnrollmentCode,
	}
}

export function isPrivateUpdateEnabled(): boolean {
	return getUpdateConfig() !== null
}
