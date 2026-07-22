import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"

type LoginGateProps = {
	onLogin: () => void
}

export function LoginGate({ onLogin }: LoginGateProps) {
	const { navigateToAccount } = useExtensionState()

	return (
		<div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
			<span aria-hidden className="codicon codicon-lock text-3xl text-(--vscode-descriptionForeground)" />
			<div className="flex flex-col gap-1">
				<h2 className="m-0 text-base font-semibold">Sign in to send feedback</h2>
				<p className="m-0 text-sm text-(--vscode-descriptionForeground)">
					Feedback requires an Axline account. Tokens never enter this panel.
				</p>
			</div>
			<VSCodeButton
				appearance="primary"
				onClick={() => {
					onLogin()
					navigateToAccount()
				}}>
				Sign in to Axline
			</VSCodeButton>
		</div>
	)
}
