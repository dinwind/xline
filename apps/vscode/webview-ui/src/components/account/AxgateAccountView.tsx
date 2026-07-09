import type { AxgateAccountSummary } from "@shared/proto/cline/account"
import { EmptyRequest } from "@shared/proto/cline/common"
import { VSCodeButton, VSCodeDivider, VSCodeTag } from "@vscode/webview-ui-toolkit/react"
import { memo, useCallback, useEffect, useState } from "react"
import { useInterval } from "react-use"
import { type ClineUser, handleSignOut } from "@/context/ClineAuthContext"
import { AccountServiceClient } from "@/services/grpc-client"

type AxgateAccountViewProps = {
	clineUser: ClineUser
}

export const AxgateAccountView = memo(({ clineUser }: AxgateAccountViewProps) => {
	const { email, displayName, uid } = clineUser
	const [summary, setSummary] = useState<AxgateAccountSummary | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastFetchTime, setLastFetchTime] = useState<number>(Date.now())

	const fetchSummary = useCallback(async () => {
		try {
			setIsLoading(true)
			setError(null)
			const response = await AccountServiceClient.getAxgateAccountSummary(EmptyRequest.create())
			setSummary(response)
			setLastFetchTime(Date.now())
		} catch (fetchError) {
			console.error("Failed to fetch AxGate account summary:", fetchError)
			setError(fetchError instanceof Error ? fetchError.message : "Failed to load account data")
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		void fetchSummary()
	}, [fetchSummary])

	useInterval(() => {
		void fetchSummary()
	}, 60000)

	const subject = summary?.subject || uid
	const roles = summary?.roles ?? []
	const providers = summary?.providers ?? []
	const models = summary?.models ?? []
	const quotaUsage = summary?.quotaUsageJson ? tryParseJson(summary.quotaUsageJson) : null
	const hasQuotaUsage =
		quotaUsage !== null && typeof quotaUsage === "object" && !Array.isArray(quotaUsage) && Object.keys(quotaUsage).length > 0

	return (
		<div className="h-full flex flex-col">
			<div className="flex flex-col h-full">
				<div className="flex flex-col w-full gap-1 mb-6">
					<div className="flex items-center flex-wrap gap-y-4">
						<div className="size-16 rounded-full bg-button-background flex items-center justify-center text-2xl text-button-foreground mr-4">
							{displayName?.[0] || email?.[0] || subject?.[0] || "?"}
						</div>

						<div className="flex flex-col">
							{displayName && <h2 className="text-foreground m-0 text-lg font-medium">{displayName}</h2>}
							{email && <div className="text-sm text-description">{email}</div>}
							<div className="text-xs text-description mt-1">Subject: {subject}</div>
							{roles.length > 0 && (
								<div className="flex flex-wrap gap-1 mt-2">
									{roles.map((role) => (
										<VSCodeTag className="text-xs" key={role}>
											{role}
										</VSCodeTag>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				<VSCodeButton appearance="secondary" className="w-full" onClick={() => handleSignOut()}>
					Log out
				</VSCodeButton>

				<VSCodeDivider className="w-full my-6" />

				<div className="flex items-center justify-between mb-2">
					<h3 className="text-sm font-semibold m-0">Gateway Status</h3>
					<button
						className="text-xs text-(--vscode-textLink-foreground) bg-transparent border-0 cursor-pointer"
						disabled={isLoading}
						onClick={() => void fetchSummary()}
						type="button">
						Refresh
					</button>
				</div>
				<div className="text-sm text-description mb-4">
					{summary?.healthStatus ? `Health: ${summary.healthStatus}` : isLoading ? "Loading..." : "Unknown"}
					{lastFetchTime ? ` · Updated ${new Date(lastFetchTime).toLocaleTimeString()}` : null}
				</div>
				{error ? <p className="text-(--vscode-errorForeground) text-xs m-0 mb-4">{error}</p> : null}

				<h3 className="text-sm font-semibold m-0 mb-2">Permitted Models</h3>
				{models.length > 0 ? (
					<div className="flex flex-wrap gap-1 mb-4">
						{models.map((model) => (
							<VSCodeTag className="text-xs" key={model}>
								{model}
							</VSCodeTag>
						))}
					</div>
				) : (
					<p className="text-sm text-description m-0 mb-4">
						{isLoading ? "Loading models..." : "No models permitted for your account."}
					</p>
				)}

				<h3 className="text-sm font-semibold m-0 mb-2">Your Providers</h3>
				{providers.length > 0 ? (
					<div className="flex flex-col gap-2 mb-4">
						{providers.map((provider) => (
							<div
								className="flex items-center justify-between border border-(--vscode-panel-border) rounded px-3 py-2"
								key={`${provider.name}-${provider.model ?? ""}`}>
								<div>
									<div className="text-sm font-medium">{provider.name}</div>
									{provider.model ? <div className="text-xs text-description">{provider.model}</div> : null}
								</div>
								<VSCodeTag className="text-xs">{provider.enabled ? "Enabled" : "Disabled"}</VSCodeTag>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-description m-0 mb-4">
						{isLoading ? "Loading providers..." : "No providers assigned to your account."}
					</p>
				)}

				<h3 className="text-sm font-semibold m-0 mb-2">Quota</h3>
				{summary?.quotaLimit !== undefined ? (
					<div className="text-sm text-description mb-2">Project limit: {summary.quotaLimit}</div>
				) : null}
				{subject ? <div className="text-xs text-description mb-2">Your project ID: ide-{subject}</div> : null}
				{hasQuotaUsage ? (
					<pre className="text-xs overflow-auto p-3 rounded bg-(--vscode-editor-background) border border-(--vscode-panel-border) m-0">
						{JSON.stringify(quotaUsage, null, 2)}
					</pre>
				) : (
					<p className="text-sm text-description m-0">
						{isLoading ? "Loading quota..." : "No usage recorded for your project yet."}
					</p>
				)}
			</div>
		</div>
	)
})

AxgateAccountView.displayName = "AxgateAccountView"

function tryParseJson(value: string): unknown {
	try {
		return JSON.parse(value)
	} catch {
		return value
	}
}
