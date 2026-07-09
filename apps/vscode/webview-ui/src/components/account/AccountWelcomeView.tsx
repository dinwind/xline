import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useCallback, useState } from "react"
import { useClineSignIn } from "@/context/ClineAuthContext"
import { useExtensionState } from "@/context/ExtensionStateContext"
import ClineLogoVariable from "../../assets/ClineLogoVariable"

export const AccountWelcomeView = () => {
	const { environment } = useExtensionState()
	const { isLoginLoading, authStatusMessage, loginError, handleSignIn } = useClineSignIn()
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")

	const canSubmit = !isLoginLoading && Boolean(username.trim()) && Boolean(password)

	const submit = useCallback(() => {
		if (canSubmit) {
			handleSignIn(username.trim(), password)
		}
	}, [canSubmit, handleSignIn, username, password])

	return (
		<div className="flex flex-col items-center w-full max-w-80 mx-auto pt-8">
			<ClineLogoVariable className="size-14 mb-4" environment={environment} />

			<h2 className="m-0 mb-1 text-lg font-semibold text-foreground">Sign in to Axline</h2>
			<p className="m-0 mb-6 text-sm text-description text-center leading-relaxed">
				Access AxGate models, view usage, and manage your provider settings.
			</p>

			<form
				className="flex flex-col gap-3 w-full"
				onSubmit={(event) => {
					event.preventDefault()
					submit()
				}}>
				<VSCodeTextField
					autoFocus
					className="w-full"
					disabled={isLoginLoading}
					onInput={(event) => setUsername((event.target as HTMLInputElement).value)}
					placeholder="you@example.com"
					value={username}>
					Email or username
				</VSCodeTextField>

				<VSCodeTextField
					className="w-full"
					disabled={isLoginLoading}
					onInput={(event) => setPassword((event.target as HTMLInputElement).value)}
					placeholder="••••••••"
					type="password"
					value={password}>
					Password
				</VSCodeTextField>

				<VSCodeButton className="w-full mt-1" disabled={!canSubmit} onClick={submit}>
					{isLoginLoading ? (
						<span className="flex items-center gap-1.5">
							<span aria-hidden className="codicon codicon-loading animate-spin" />
							Signing in…
						</span>
					) : (
						"Sign in"
					)}
				</VSCodeButton>
			</form>

			{authStatusMessage ? (
				<div className="flex items-start gap-1.5 mt-4 text-xs text-description">
					<span aria-hidden className="codicon codicon-info !text-xs mt-px shrink-0" />
					<span className="min-w-0 break-words">{authStatusMessage}</span>
				</div>
			) : null}

			{loginError ? (
				<div className="flex items-start gap-1.5 mt-4 w-full rounded-sm border border-error/40 bg-error/10 px-2.5 py-2 text-xs text-error">
					<span aria-hidden className="codicon codicon-error !text-xs mt-px shrink-0" />
					<span className="min-w-0 break-words">{loginError}</span>
				</div>
			) : null}
		</div>
	)
}
