import { AXGATE_CLIENT_NAME, type AxgateClientIdentity, buildAxgateClientHeaders } from "@cline/core"
import { ExtensionRegistryInfo } from "@/registry"
import { readAxgateDeviceToken } from "@/services/identity/device-token"
import { getInstallationId } from "@/services/identity/installation-id"

export function resolveAxgateClientIdentity(deviceToken?: string): AxgateClientIdentity {
	const installationId = getInstallationId()
	if (!installationId) {
		throw new Error("Axline installation ID is not initialized")
	}

	return {
		clientName: AXGATE_CLIENT_NAME,
		clientVersion: ExtensionRegistryInfo.version,
		installationId,
		...(deviceToken?.trim() ? { deviceToken: deviceToken.trim() } : {}),
	}
}

export async function resolveAxgateClientIdentityWithToken(): Promise<AxgateClientIdentity> {
	const deviceToken = await readAxgateDeviceToken()
	return resolveAxgateClientIdentity(deviceToken)
}

export async function buildAxgateRequestHeaders(base?: HeadersInit, deviceToken?: string): Promise<Headers> {
	const identity =
		deviceToken === undefined ? await resolveAxgateClientIdentityWithToken() : resolveAxgateClientIdentity(deviceToken)
	return buildAxgateClientHeaders(identity, base)
}
