import { AXLINE_AXGATE_DEVICE_TOKEN_SECRET_KEY } from "@shared/storage/state-keys"
import { StateManager } from "@/core/storage/StateManager"

export async function readAxgateDeviceToken(): Promise<string | undefined> {
	const token = StateManager.get().getSecretKey(AXLINE_AXGATE_DEVICE_TOKEN_SECRET_KEY)?.trim()
	return token || undefined
}

export async function writeAxgateDeviceToken(token: string): Promise<void> {
	StateManager.get().setSecret(AXLINE_AXGATE_DEVICE_TOKEN_SECRET_KEY, token.trim())
}

export async function clearAxgateDeviceToken(): Promise<void> {
	StateManager.get().setSecret(AXLINE_AXGATE_DEVICE_TOKEN_SECRET_KEY, undefined)
}
