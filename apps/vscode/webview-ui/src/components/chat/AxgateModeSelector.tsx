import { CommitModelSelectionRequest } from "@shared/proto/cline/models"
import { PlanActMode, TogglePlanActModeRequest } from "@shared/proto/cline/state"
import { toProtobufModelInfo } from "@shared/proto-conversions/models/typeConversion"
import { CheckIcon } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderModels } from "@/hooks/useProviderModels"
import { cn } from "@/lib/utils"
import { ModelsServiceClient, StateServiceClient } from "@/services/grpc-client"
import {
	AXGATE_CHAT_MODES,
	type AxgateChatMode,
	deriveAxgateChatMode,
	modelInfoForId,
	resolveAgentModelId,
} from "./axgate-chat-mode"

type ChatComposerSnapshot = {
	text: string
	images: string[]
	files: string[]
}

type AxgateModeSelectorProps = {
	composer: ChatComposerSnapshot
	onComposerConsumed?: (snapshot: ChatComposerSnapshot) => void
}

export const AxgateModeSelector = ({ composer, onComposerConsumed }: AxgateModeSelectorProps) => {
	const { mode, apiConfiguration } = useExtensionState()
	const { models } = useProviderModels("axgate")
	const [open, setOpen] = useState(false)
	const [isSwitching, setIsSwitching] = useState(false)

	const allowedModelIds = useMemo(() => Object.keys(models), [models])
	const provider = apiConfiguration?.actModeApiProvider
	const actModelId = apiConfiguration?.actModeApiModelId

	const currentMode = useMemo(() => deriveAxgateChatMode(mode, provider, actModelId), [mode, provider, actModelId])

	const currentMeta = AXGATE_CHAT_MODES.find((entry) => entry.id === currentMode) ?? AXGATE_CHAT_MODES[0]

	const commitActModel = useCallback(
		async (modelId: string) => {
			const modelInfo = modelInfoForId(modelId, models)
			await ModelsServiceClient.commitModelSelection(
				CommitModelSelectionRequest.create({
					providerId: "axgate",
					mode: "act",
					modelId,
					modelInfo: toProtobufModelInfo(modelInfo),
				}),
			)
		},
		[models],
	)

	const switchPlanAct = useCallback(
		async (target: "plan" | "act") => {
			if ((target === "plan" && mode === "plan") || (target === "act" && mode === "act")) {
				return true
			}

			const protoMode = target === "plan" ? PlanActMode.PLAN : PlanActMode.ACT
			const response = await StateServiceClient.togglePlanActModeProto(
				TogglePlanActModeRequest.create({
					mode: protoMode,
					chatContent: {
						message: composer.text.trim() ? composer.text : undefined,
						images: composer.images,
						files: composer.files,
					},
				}),
			)
			return response.value
		},
		[composer.files, composer.images, composer.text, mode],
	)

	const selectMode = useCallback(
		async (target: AxgateChatMode) => {
			if (target === currentMode || isSwitching) {
				setOpen(false)
				return
			}

			setIsSwitching(true)
			try {
				if (target === "plan") {
					const consumed = await switchPlanAct("plan")
					if (consumed) {
						onComposerConsumed?.(composer)
					}
					setOpen(false)
					return
				}

				const consumed = await switchPlanAct("act")
				if (consumed) {
					onComposerConsumed?.(composer)
				}

				const nextModelId = target === "auto" ? "auto" : resolveAgentModelId(actModelId, allowedModelIds)
				if (nextModelId !== actModelId) {
					await commitActModel(nextModelId)
				}
			} catch (error) {
				console.error("Failed to switch AxGate chat mode:", error)
			} finally {
				setIsSwitching(false)
				setOpen(false)
			}
		},
		[actModelId, allowedModelIds, commitActModel, composer, currentMode, isSwitching, onComposerConsumed, switchPlanAct],
	)

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<button
					className={cn(
						"inline-flex items-center gap-1 rounded-full border border-border-panel",
						"bg-transparent px-2 py-0.5 text-xs text-foreground",
						"hover:bg-toolbar-hover disabled:opacity-50 disabled:cursor-default",
					)}
					data-testid="axgate-mode-selector"
					disabled={isSwitching}
					type="button">
					<span aria-hidden className={`codicon codicon-${currentMeta.icon} !text-[11px] text-icon-foreground`} />
					<span className="font-medium">{currentMeta.label}</span>
					<span aria-hidden className="codicon codicon-chevron-down !text-[10px] text-description" />
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-56 p-1" side="top">
				{AXGATE_CHAT_MODES.map((entry) => {
					const selected = entry.id === currentMode
					return (
						<button
							className={cn(
								"flex w-full items-center gap-2 rounded-xs px-2 py-1.5 text-left text-xs",
								"hover:bg-toolbar-hover",
								selected && "bg-toolbar-hover",
							)}
							key={entry.id}
							onClick={() => void selectMode(entry.id)}
							type="button">
							<span
								aria-hidden
								className={`codicon codicon-${entry.icon} !text-sm text-icon-foreground shrink-0`}
							/>
							<span className="flex flex-col min-w-0">
								<span className="font-medium text-foreground">{entry.label}</span>
								<span className="text-[10px] text-description leading-snug">{entry.description}</span>
							</span>
							{selected ? <CheckIcon className="size-3 shrink-0 ml-auto text-success" /> : null}
						</button>
					)
				})}
			</PopoverContent>
		</Popover>
	)
}
