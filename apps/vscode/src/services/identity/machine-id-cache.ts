import { machineId } from "node-machine-id"
import { Logger } from "@/shared/services/Logger"

let sharedMachineIdPromise: Promise<string | undefined> | null = null

/**
 * Returns the OS machine ID at most once per extension host process.
 * distinctId and installationId both need this on first run; sharing avoids duplicate ~20ms reads.
 */
export function getSharedMachineId(): Promise<string | undefined> {
	if (!sharedMachineIdPromise) {
		sharedMachineIdPromise = (async () => {
			try {
				const id = await machineId()
				return id?.trim() || undefined
			} catch (error) {
				Logger.warn("[MachineId] Failed to read machine ID:", error)
				return undefined
			}
		})()
	}
	return sharedMachineIdPromise
}

/** Test-only: clear the in-process cache between unit tests. */
export function resetSharedMachineIdCache(): void {
	sharedMachineIdPromise = null
}
