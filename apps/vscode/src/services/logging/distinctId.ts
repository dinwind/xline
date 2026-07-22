import { v4 as uuidv4 } from "uuid"
import { HostRegistryInfo } from "@/registry"
import { getSharedMachineId } from "@/services/identity/machine-id-cache"
import { Logger } from "@/shared/services/Logger"
import { StorageContext } from "@/shared/storage"

/*
 * Unique identifier for the current installation.
 */
let _distinctId = ""

let hostRegistryInitPromise: Promise<void> | undefined

/**
 * Host banner/telemetry metadata is populated asynchronously during distinct ID init.
 * Await before components that call HostRegistryInfo.get() (e.g. BannerService).
 */
export function ensureHostRegistryInfoReady(): Promise<void> {
	return hostRegistryInitPromise ?? Promise.resolve()
}

/**
 * Some environments don't return a value for the machine ID. For these situations we generated
 * a unique ID and store it locally.
 */
export const _GENERATED_MACHINE_ID_KEY = "cline.generatedMachineId"

export async function initializeDistinctId(storage: StorageContext, uuid: () => string = uuidv4) {
	// Try to read the ID from storage.
	let distinctId = storage.globalState.get<string>(_GENERATED_MACHINE_ID_KEY)

	if (!distinctId) {
		// Get the ID from the host environment (shared in-process cache).
		distinctId = await getSharedMachineId()
	}
	if (!distinctId) {
		// Fallback to generating a unique ID and keeping in global storage.
		Logger.warn("No machine ID found for telemetry, generating UUID")
		// Add a prefix to the UUID so we can see in the telemetry how many clients are don't have a machine ID.
		distinctId = `cl-${uuid()}`
		storage.globalState.update(_GENERATED_MACHINE_ID_KEY, distinctId)
	}

	setDistinctId(distinctId)

	hostRegistryInitPromise = HostRegistryInfo.init(distinctId)

	Logger.log("[DistinctId] initialized:", distinctId)
}

/*
 * Set the distinct ID for logging and telemetry.
 * This is updated to Cline User ID when authenticated.
 */
export function setDistinctId(newId: string) {
	if (_distinctId && _distinctId !== newId) {
		Logger.log("[DistinctId] Updating...", `From ${_distinctId} to ${newId}`)
	}
	_distinctId = newId
}

/*
 * Unique identifier for the current user
 * If authenticated, this will be the Cline User ID.
 * Else, this will be the machine ID, or the anonymous ID as a fallback.
 */
export function getDistinctId() {
	if (!_distinctId) {
		Logger.debug("[DistinctId] Not initialized. Call initializeDistinctId() first.")
	}
	return _distinctId
}
