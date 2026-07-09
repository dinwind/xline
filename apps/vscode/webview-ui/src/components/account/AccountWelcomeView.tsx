import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useState } from "react"
import { useClineSignIn } from "@/context/ClineAuthContext"
import { useExtensionState } from "@/context/ExtensionStateContext"
import ClineLogoVariable from "../../assets/ClineLogoVariable"

export const AccountWelcomeView = () => {
	const { environment } = useExtensionState()
	const { isLoginLoading, authStatusMessage, loginError, handleSignIn } = useClineSignIn()
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")

	return (
		<div className="flex flex-col items-center gap-2.5 w-full">
			<ClineLogoVariable className="size-16 mb-4" environment={environment} />

			<p>Sign in with your Axline account to access AxGate models, view usage, and manage your provider settings.</p>

			<VSCodeTextField
				className="w-full"
				disabled={isLoginLoading}
				onInput={(event) => setUsername((event.target as HTMLInputElement).value)}
				placeholder="Email or username"
				value={username}>
				Username
			</VSCodeTextField>

			<VSCodeTextField
				className="w-full"
				disabled={isLoginLoading}
				onInput={(event) => setPassword((event.target as HTMLInputElement).value)}
				placeholder="Password"
				type="password"
				value={password}>
				Password
			</VSCodeTextField>

			<VSCodeButton
				className="w-full mb-2"
				disabled={isLoginLoading || !username.trim() || !password}
				onClick={() => handleSignIn(username.trim(), password)}>
				Sign in with Axline
				{isLoginLoading && (
					<span className="ml-1 animate-spin">
						<span className="codicon codicon-refresh" />
					</span>
				)}
			</VSCodeButton>

			{authStatusMessage ? (
				<p className="text-(--vscode-descriptionForeground) text-xs text-center m-0">{authStatusMessage}</p>
			) : null}
			{loginError ? <p className="text-(--vscode-errorForeground) text-xs text-center m-0">{loginError}</p> : null}
		</div>
	)
}
