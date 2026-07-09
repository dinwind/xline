import { detectInstructionSystemForWorkspace, hasCokodoAgentProtocol } from "@cline/shared/storage"
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

	await ensureCokodoAgentMcpServer(workspacePath, () => controller.mcpHub!.getMcpSettingsFilePath())

	try {
		await refreshClineRulesToggles(controller, workspacePath)
	} catch (error) {
		Logger.warn("[Cokodo] Failed to refresh rule toggles after protocol sync:", error)
	}

	await controller.postStateToWebview()
}
