import { type ModelInfo, openAiModelInfoSafeDefaults } from "@shared/api"
import type { Mode } from "@shared/storage/types"

/** AxGate chat modes shown in the composer (maps to backend act / plan / auto model routing). */
export type AxgateChatMode = "agent" | "plan" | "auto"

export const AXGATE_CHAT_MODES: Array<{
	id: AxgateChatMode
	label: string
	description: string
	icon: string
	backendMode: Mode | "auto"
}> = [
	{
		id: "agent",
		label: "Agent",
		description: "Execute tasks with the selected model (act mode).",
		icon: "sparkle",
		backendMode: "act",
	},
	{
		id: "plan",
		label: "Plan",
		description: "Explore and architect before executing (plan mode).",
		icon: "list-tree",
		backendMode: "plan",
	},
	{
		id: "auto",
		label: "Auto",
		description: "Let AxGate route to the best permitted model (auto).",
		icon: "wand",
		backendMode: "auto",
	},
]

export function deriveAxgateChatMode(mode: Mode, provider: string | undefined, modelId: string | undefined): AxgateChatMode {
	if (mode === "plan") {
		return "plan"
	}
	const normalized = modelId?.trim().toLowerCase()
	if (provider === "axgate" && (!normalized || normalized === "auto" || normalized === "ax_auto")) {
		return "auto"
	}
	return "agent"
}

export function resolveAgentModelId(currentModelId: string | undefined, allowedModels: string[]): string {
	if (currentModelId && currentModelId !== "auto" && allowedModels.includes(currentModelId)) {
		return currentModelId
	}
	const concrete = allowedModels.find((id) => id !== "auto")
	return concrete ?? allowedModels[0] ?? "auto"
}

export function modelInfoForId(modelId: string, models: Record<string, ModelInfo>) {
	return models[modelId] ?? openAiModelInfoSafeDefaults
}
