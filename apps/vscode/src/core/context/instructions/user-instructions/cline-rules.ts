import { type InstructionSystem, normalizeInstructionSystem } from "@cline/shared/storage"
import { synchronizeRuleToggles } from "@core/context/instructions/user-instructions/rule-helpers"
import { ensureRulesDirectoryExists, GlobalFileNames } from "@core/storage/disk"
import { ClineRulesToggles } from "@shared/cline-rules"
import path from "path"
import { Controller } from "@/core/controller"

const COKODO_LOCAL_RULE_EXCLUSIONS: string[][] = [
	[".agent", "skills"],
	[".agent", "core", "workflows"],
	[".agent", "project", "sop"],
	[".agent", "project", "adr"],
	[".agent", "project", "specs"],
	[".agent", "project", "changes"],
	[".agent", "project", "events"],
	[".agent", "adapters"],
	[".agent", "scripts"],
	[".agent", "templates"],
]

function getInstructionSystem(controller: Controller): InstructionSystem {
	return normalizeInstructionSystem(controller.stateManager.getGlobalSettingsKey("instructionSystem"))
}

export async function refreshClineRulesToggles(
	controller: Controller,
	workingDirectory: string,
): Promise<{
	globalToggles: ClineRulesToggles
	localToggles: ClineRulesToggles
}> {
	const instructionSystem = getInstructionSystem(controller)

	let globalToggles = controller.stateManager.getGlobalSettingsKey("globalClineRulesToggles")
	if (instructionSystem !== "cokodo") {
		const globalClineRulesFilePath = await ensureRulesDirectoryExists()
		globalToggles = await synchronizeRuleToggles(globalClineRulesFilePath, globalToggles)
		controller.stateManager.setGlobalState("globalClineRulesToggles", globalToggles)
	}

	let localToggles = controller.stateManager.getWorkspaceStateKey("localClineRulesToggles")

	if (instructionSystem === "cline" || instructionSystem === "both") {
		const localClineRulesFilePath = path.resolve(workingDirectory, GlobalFileNames.clineRules)
		localToggles = await synchronizeRuleToggles(localClineRulesFilePath, localToggles, "", [
			[".clinerules", "workflows"],
			[".clinerules", "hooks"],
			[".clinerules", "skills"],
		])
	}

	if (instructionSystem === "cokodo" || instructionSystem === "both") {
		const agentRoot = path.resolve(workingDirectory, GlobalFileNames.agentProtocolDir)
		localToggles = await synchronizeRuleToggles(agentRoot, localToggles, "", COKODO_LOCAL_RULE_EXCLUSIONS)
	}

	controller.stateManager.setWorkspaceState("localClineRulesToggles", localToggles)

	return {
		globalToggles,
		localToggles,
	}
}
