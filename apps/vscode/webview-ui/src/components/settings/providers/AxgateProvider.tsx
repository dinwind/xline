import { openAiModelInfoSafeDefaults } from "@shared/api"
import type { Mode } from "@shared/storage/types"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderConfig } from "@/hooks/useProviderConfig"
import { useProviderModelSelection } from "@/hooks/useProviderModelSelection"
import { useProviderModels } from "@/hooks/useProviderModels"
import { ClineAccountInfoCard } from "../ClineAccountInfoCard"
import { ModelInfoView } from "../common/ModelInfoView"
import { type ModelPickerSelection, ModelPickerWithManualEntry } from "./ModelPickerWithManualEntry"

interface AxgateProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

const PROVIDER_ID = "axgate"

export const AxgateProvider = ({ showModelOptions, isPopup, currentMode }: AxgateProviderProps) => {
	const { axgateAuthEnabled } = useExtensionState()
	const { models, defaultModelId, isLoading, isStale, error, refresh } = useProviderModels(PROVIDER_ID)
	const { config, commitSelection } = useProviderConfig(PROVIDER_ID)
	const { selectedModel, commitModelSelection } = useProviderModelSelection(PROVIDER_ID, currentMode, {
		models,
		defaultModelId,
		config,
		commitSelection,
	})

	const handleModelSelect = (selection: ModelPickerSelection) => {
		void commitModelSelection(selection).catch((err) => console.error("Failed to commit AxGate model selection:", err))
	}

	return (
		<div>
			{axgateAuthEnabled ? (
				<div style={{ marginBottom: 14, marginTop: 4 }}>
					<ClineAccountInfoCard />
				</div>
			) : null}

			{showModelOptions ? (
				<>
					<ModelPickerWithManualEntry
						allowsCustomIds={false}
						error={error}
						isLoading={isLoading}
						isStale={isStale}
						models={models}
						onSelect={handleModelSelect}
						selectedModel={selectedModel}
					/>
					<ModelInfoView
						isPopup={isPopup}
						modelInfo={selectedModel.modelInfo ?? openAiModelInfoSafeDefaults}
						selectedModelId={selectedModel.modelId}
					/>
					{!isLoading && Object.keys(models).length === 0 ? (
						<p className="text-xs text-description mt-2 mb-0">
							No models are permitted for your account. Contact your administrator to assign model access.
						</p>
					) : null}
					<VSCodeButton appearance="secondary" className="mt-2" onClick={() => void refresh()}>
						Refresh permitted models
					</VSCodeButton>
				</>
			) : null}
		</div>
	)
}
