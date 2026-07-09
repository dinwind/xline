import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const COKODO_AGENT_INSTALL_COMMAND = "pip install cokodo-agent"

/**
 * Check whether the Cokodo Agent CLI (`co`) is available on PATH.
 */
export async function isCokodoAgentInstalled(): Promise<boolean> {
	try {
		const { stdout } = await execAsync("co version", {
			timeout: 5000,
		})
		return stdout.toLowerCase().includes("cokodo-agent")
	} catch {
		return false
	}
}
