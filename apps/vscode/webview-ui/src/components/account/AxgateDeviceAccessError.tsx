import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { memo } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"

type AxgateDeviceAccessErrorProps = {
	message: string
	errorCode?: string
	minimumVersion?: string
}

export const AxgateDeviceAccessError = memo(({ message, errorCode, minimumVersion }: AxgateDeviceAccessErrorProps) => {
	const { navigateToAccount } = useExtensionState()
	const isVersionError = errorCode === "CLIENT_VERSION_UNSUPPORTED"

	return (
		<div className="flex flex-col gap-3">
			<p className="m-0 whitespace-pre-wrap text-error wrap-anywhere">{message}</p>
			{minimumVersion ? (
				<p className="m-0 text-xs text-description">
					Minimum supported version: <span className="font-mono">{minimumVersion}</span>
				</p>
			) : null}
			{isVersionError ? (
				<p className="m-0 text-xs text-description">
					Update Axline through your administrator or private update channel, then restart VS Code.
				</p>
			) : null}
			<VSCodeButton appearance="primary" onClick={() => navigateToAccount()}>
				{isVersionError ? "Open Account" : "Review device status"}
			</VSCodeButton>
		</div>
	)
})

AxgateDeviceAccessError.displayName = "AxgateDeviceAccessError"
