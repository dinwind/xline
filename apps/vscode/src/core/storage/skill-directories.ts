import {
	DEFAULT_INSTRUCTION_SYSTEM,
	type InstructionSystem,
	normalizeInstructionSystem,
	resolveManifestSkillDirectories,
} from "@cline/shared/storage"
import os from "os"
import * as path from "path"

const SKILL_DIRECTORY_NAMES = {
	clineruleSkillsDir: ".clinerules/skills",
	clineSkillsDir: ".cline/skills",
	claudeSkillsDir: ".claude/skills",
	agentsSkillsDir: ".agents/skills",
	agentSkillsDir: ".agent/skills",
} as const

export type SkillsScanDirectory = {
	path: string
	source: "project" | "global"
}

function getClineHomePath(): string {
	return path.join(os.homedir(), ".cline")
}

function getClineSkillsDirectoryPath(): string {
	return path.join(getClineHomePath(), "skills")
}

function getAgentSkillsDirectoryPath(): string {
	return path.join(os.homedir(), ".agents", "skills")
}

function getCokodoProjectSkillDirectories(cwd: string): SkillsScanDirectory[] {
	return resolveManifestSkillDirectories(cwd).map((directoryPath) => ({
		path: directoryPath,
		source: "project" as const,
	}))
}

function getClineProjectSkillDirectories(cwd: string): SkillsScanDirectory[] {
	return [
		{ path: path.join(cwd, SKILL_DIRECTORY_NAMES.clineruleSkillsDir), source: "project" },
		{ path: path.join(cwd, SKILL_DIRECTORY_NAMES.clineSkillsDir), source: "project" },
		{ path: path.join(cwd, SKILL_DIRECTORY_NAMES.claudeSkillsDir), source: "project" },
		{ path: path.join(cwd, SKILL_DIRECTORY_NAMES.agentsSkillsDir), source: "project" },
	]
}

function getClineGlobalSkillDirectories(): SkillsScanDirectory[] {
	return [
		{ path: getClineSkillsDirectoryPath(), source: "global" },
		{ path: getAgentSkillsDirectoryPath(), source: "global" },
	]
}

/**
 * Returns the list of skills directories to scan without creating them.
 * Order is project directories first, then global directories.
 */
export function getSkillsDirectoriesForScan(
	cwd: string,
	instructionSystem: InstructionSystem = DEFAULT_INSTRUCTION_SYSTEM,
): SkillsScanDirectory[] {
	const system = normalizeInstructionSystem(instructionSystem)

	switch (system) {
		case "cokodo":
			return getCokodoProjectSkillDirectories(cwd)
		case "cline":
			return [...getClineProjectSkillDirectories(cwd), ...getClineGlobalSkillDirectories()]
		case "both":
			return [
				...getCokodoProjectSkillDirectories(cwd),
				...getClineProjectSkillDirectories(cwd),
				...getClineGlobalSkillDirectories(),
			]
	}
}
