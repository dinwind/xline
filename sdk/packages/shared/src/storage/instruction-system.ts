/**
 * Instruction system selection for Axline.
 *
 * - `cokodo`: load rules/workflows/skills from `.agent/` (Cokodo agent protocol)
 * - `cline`: load from legacy Cline paths (`.clinerules`, `.cline`, `~/Documents/Cline`, etc.)
 * - `both`: Cokodo paths first, then Cline paths as fallback
 */
export type InstructionSystem = "cokodo" | "cline" | "both";

export const INSTRUCTION_SYSTEMS: ReadonlyArray<InstructionSystem> = [
	"cokodo",
	"cline",
	"both",
] as const;

export const DEFAULT_INSTRUCTION_SYSTEM: InstructionSystem = "cokodo";

export function normalizeInstructionSystem(
	value: string | undefined | null,
): InstructionSystem {
	if (value === "cline" || value === "both") {
		return value;
	}
	return DEFAULT_INSTRUCTION_SYSTEM;
}

export function isInstructionSystem(value: string): value is InstructionSystem {
	return INSTRUCTION_SYSTEMS.includes(value as InstructionSystem);
}
