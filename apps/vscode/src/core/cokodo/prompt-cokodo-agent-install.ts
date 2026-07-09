import { ShowMessageType } from "@shared/proto/host/window"
import { ExecuteCommandInTerminalRequest } from "@shared/proto/host/workspace"
import { HostProvider } from "@/hosts/host-provider"
import { Logger } from "@/shared/services/Logger"
import { COKODO_AGENT_INSTALL_COMMAND, isCokodoAgentInstalled } from "@/utils/cokodo-agent-detector"

const INSTALL_ACTION = "Install"
const LATER_ACTION = "Later"

let installPromptShownThisSession = false

export function resetCokodoAgentInstallPromptForTests(): void {
	installPromptShownThisSession = false
}

export async function promptCokodoAgentInstallIfNeeded(): Promise<void> {
	if (installPromptShownThisSession) {
		return
	}

	const installed = await isCokodoAgentInstalled()
	if (installed) {
		return
	}

	installPromptShownThisSession = true

	const selected = await HostProvider.window.showMessage({
		type: ShowMessageType.WARNING,
		message: "Cokodo Agent CLI (`co`) is not installed. Install it to enable the Cokodo MCP server and protocol tools.",
		options: {
			items: [INSTALL_ACTION, LATER_ACTION],
		},
	})

	if (selected.selectedOption !== INSTALL_ACTION) {
		return
	}

	try {
		const response = await HostProvider.workspace.executeCommandInTerminal(
			ExecuteCommandInTerminalRequest.create({
				command: COKODO_AGENT_INSTALL_COMMAND,
			}),
		)
		if (!response.success) {
			throw new Error("Failed to execute command in terminal")
		}
	} catch (error) {
		Logger.error("[Cokodo] Failed to start cokodo-agent installation:", error)
		await HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: `Failed to start Cokodo Agent installation: ${error instanceof Error ? error.message : "Unknown error"}`,
			options: { items: [] },
		})
	}
}
