import { StringRequest } from "@shared/proto/cline/common"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useClineAuth } from "@/context/ClineAuthContext"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { UiServiceClient } from "@/services/grpc-client"

export const ClineAccountInfoCard = ({ usageLink }: { usageLink?: string }) => {
	const { clineUser } = useClineAuth()
	const { navigateToAccount } = useExtensionState()
	const handleLogin = () => {
		navigateToAccount()
	}

	const handleShowAccount = () => {
		if (!usageLink) {
			return navigateToAccount()
		}

		UiServiceClient.openUrl(StringRequest.create({ value: usageLink })).catch((err) => {
			console.error("Failed to open usage link:", err)
		})
	}

	return (
		<div className="max-w-[600px]">
			{clineUser ? (
				<VSCodeButton appearance="secondary" onClick={handleShowAccount}>
					View Billing & Usage
				</VSCodeButton>
			) : (
				<div className="flex flex-col gap-3">
					<VSCodeButton className="mt-0" onClick={handleLogin}>
						Sign in with Axline
					</VSCodeButton>
				</div>
			)}
		</div>
	)
}
