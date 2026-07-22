import { createHash } from "node:crypto"
import { v4 as uuidv4 } from "uuid"
import { getSharedMachineId } from "@/services/identity/machine-id-cache"
import { Logger } from "@/shared/services/Logger"
import type { StorageContext } from "@/shared/storage"

export const AXLINE_INSTALLATION_ID_KEY = "axline.installationId"

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let _installationId = ""
let _storage: StorageContext | null = null

export function isValidInstallationId(value: string | undefined): value is string {
	return typeof value === "string" && UUID_V4_PATTERN.test(value.trim())
}

/**
 * Derive a stable RFC-4122 UUID v4-formatted installation ID from a machine identifier.
 * The same machine ID always produces the same installation ID.
 */
export function deriveInstallationIdFromMachineId(rawMachineId: string): string {
	const digest = createHash("sha256").update(`axline:v1:${rawMachineId.trim()}`).digest()
	const bytes = Buffer.from(digest.subarray(0, 16))
	bytes[6] = (bytes[6] & 0x0f) | 0x40
	bytes[8] = (bytes[8] & 0x3f) | 0x80
	const hex = bytes.toString("hex")
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function generateInstallationId(uuid: () => string = uuidv4): string {
	return uuid()
}

async function resolveMachineInstallationId(
	readMachineId: () => Promise<string | undefined> = getSharedMachineId,
): Promise<string | undefined> {
	try {
		const id = await readMachineId()
		if (!id?.trim()) {
			return undefined
		}
		const derived = deriveInstallationIdFromMachineId(id)
		return isValidInstallationId(derived) ? derived : undefined
	} catch (error) {
		Logger.warn("[InstallationId] Failed to read machine ID:", error)
		return undefined
	}
}

export async function initializeInstallationId(
	storage: StorageContext,
	uuid: () => string = uuidv4,
	readMachineId: () => Promise<string | undefined> = getSharedMachineId,
): Promise<string> {
	_storage = storage
	const stored = storage.globalState.get<string>(AXLINE_INSTALLATION_ID_KEY)

	if (isValidInstallationId(stored)) {
		const installationId = stored.trim()
		setInstallationId(installationId)
		Logger.log("[InstallationId] initialized from storage")
		return installationId
	}

	const fromMachine = await resolveMachineInstallationId(readMachineId)
	const installationId = fromMachine ?? generateInstallationId(uuid)
	storage.globalState.update(AXLINE_INSTALLATION_ID_KEY, installationId)
	setInstallationId(installationId)
	Logger.log("[InstallationId] initialized", fromMachine ? "from machine ID" : "with generated UUID fallback")
	return installationId
}

export function setInstallationId(installationId: string): void {
	if (_installationId && _installationId !== installationId) {
		Logger.log("[InstallationId] Updating from cached value")
	}
	_installationId = installationId
}

export function getInstallationId(): string {
	if (!_installationId) {
		Logger.debug("[InstallationId] Not initialized. Call initializeInstallationId() first.")
	}
	return _installationId
}
