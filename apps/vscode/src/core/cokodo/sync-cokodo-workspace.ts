import { COKODO_MCP_SERVER_NAME, detectInstructionSystemForWorkspace, hasCokodoAgentProtocol } from "@cline/shared/storage"
import { refreshClineRulesToggles } from "@core/context/instructions/user-instructions/cline-rules"
import { promptCokodoAgentInstallIfNeeded } from "@/core/cokodo/prompt-cokodo-agent-install"
import type { Controller } from "@/core/controller"
import { ensureCokodoAgentMcpServer } from "@/services/mcp/ensure-cokodo-agent-mcp"
import { Logger } from "@/shared/services/Logger"

export async function syncCokodoWorkspaceIntegration(controller: Controller, workspacePath: string | undefined): Promise<void> {
	if (!workspacePath || !hasCokodoAgentProtocol(workspacePath)) {
		return
	}

	await promptCokodoAgentInstallIfNeeded()

	const detectedInstructionSystem = detectInstructionSystemForWorkspace(workspacePath)
	const currentInstructionSystem = controller.stateManager.getGlobalSettingsKey("instructionSystem")
	if (currentInstructionSystem !== detectedInstructionSystem) {
		controller.stateManager.setGlobalState("instructionSystem", detectedInstructionSystem)
		Logger.log(`[Cokodo] Instruction system set to "${detectedInstructionSystem}" from workspace protocol`)
	}

	const ensureResult = await ensureCokodoAgentMcpServer(workspacePath, () => controller.mcpHub!.getMcpSettingsFilePath())
	if (ensureResult === "added" || ensureResult === "updated") {
		try {
			await controller.mcpHub?.reconcileMcpServersFromSettingsRPC()
			Logger.log(`[Cokodo] Reconnected MCP servers after ${ensureResult} ${COKODO_MCP_SERVER_NAME} config`)
		} catch (error) {
			Logger.warn("[Cokodo] Failed to reconnect MCP servers after config sync:", error)
		}
	}

	try {
		await refreshClineRulesToggles(controller, workspacePath)
	} catch (error) {
		Logger.warn("[Cokodo] Failed to refresh rule toggles after protocol sync:", error)
	}

	await controller.postStateToWebview()
}
