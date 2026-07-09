import type { AxgateAccountSummary } from "@shared/proto/cline/account"
import { EmptyRequest } from "@shared/proto/cline/common"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { memo, useCallback, useEffect, useState } from "react"
import { useInterval } from "react-use"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { type ClineUser, handleSignOut } from "@/context/ClineAuthContext"
import { AccountServiceClient } from "@/services/grpc-client"
import {
	CopyableCode,
	EmptyState,
	type Health,
	IconButton,
	SectionBody,
	SectionCard,
	SectionHeader,
	SkeletonLine,
	StatusDot,
} from "../common/SectionCard"

type AxgateAccountViewProps = {
	clineUser: ClineUser
}

export const AxgateAccountView = memo(({ clineUser }: AxgateAccountViewProps) => {
	const { email, displayName, uid } = clineUser
	const [summary, setSummary] = useState<AxgateAccountSummary | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastFetchTime, setLastFetchTime] = useState<number | null>(null)

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
	const projectId = subject ? `ide-${subject}` : null

	const health = healthFromStatus(summary?.healthStatus)
	const initialLoad = isLoading && !summary

	const quotaUsage = summary?.quotaUsageJson ? tryParseJson(summary.quotaUsageJson) : null
	const usageMap =
		quotaUsage !== null && typeof quotaUsage === "object" && !Array.isArray(quotaUsage)
			? (quotaUsage as Record<string, unknown>)
			: null
	const ownUsage = usageMap && projectId && typeof usageMap[projectId] === "number" ? (usageMap[projectId] as number) : null
	const quotaLimit = typeof summary?.quotaLimit === "number" ? summary.quotaLimit : null
	const usagePercent = ownUsage !== null && quotaLimit ? Math.min(100, (ownUsage / quotaLimit) * 100) : null

	return (
		<div className="flex flex-col gap-3 pb-5">
			{/* ── Identity ─────────────────────────────────────────────── */}
			<SectionCard>
				<SectionBody className="flex items-start gap-3 py-3">
					<div className="size-10 shrink-0 rounded-full bg-button-background text-button-foreground flex items-center justify-center text-md font-medium uppercase">
						{displayName?.[0] || email?.[0] || subject?.[0] || "?"}
					</div>
					<div className="flex flex-col min-w-0 gap-0.5">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-base font-semibold text-foreground truncate">
								{displayName || email || subject}
							</span>
							{roles.map((role) => (
								<Badge key={role} variant="info">
									{role}
								</Badge>
							))}
						</div>
						{email && displayName ? <span className="text-xs text-description truncate">{email}</span> : null}
						{subject ? <CopyableCode value={subject} /> : null}
					</div>
					<IconButton className="ml-auto" icon="sign-out" onClick={() => handleSignOut()} title="Log out" />
				</SectionBody>
			</SectionCard>

			{/* ── Gateway status ───────────────────────────────────────── */}
			<SectionCard>
				<SectionHeader
					actions={
						<IconButton
							disabled={isLoading}
							icon="refresh"
							onClick={() => void fetchSummary()}
							spinning={isLoading}
							title="Refresh"
						/>
					}
					icon="radio-tower"
					title="Gateway"
				/>
				<SectionBody className="flex items-center gap-2">
					{initialLoad ? (
						<SkeletonLine className="w-40" />
					) : (
						<>
							<StatusDot health={health} pulse />
							<span className="text-sm text-foreground">{healthLabel(health, summary?.healthStatus)}</span>
							{lastFetchTime ? (
								<span className="text-xs text-description ml-auto">
									Updated {new Date(lastFetchTime).toLocaleTimeString()}
								</span>
							) : null}
						</>
					)}
				</SectionBody>
				{error ? (
					<SectionBody className="pt-0">
						<div className="flex items-start gap-1.5 text-xs text-error">
							<span aria-hidden className="codicon codicon-error !text-xs mt-px" />
							<span className="break-words min-w-0">{error}</span>
						</div>
					</SectionBody>
				) : null}
			</SectionCard>

			{/* ── Permitted models ─────────────────────────────────────── */}
			<SectionCard>
				<SectionHeader count={models.length} icon="circuit-board" title="Permitted Models" />
				<SectionBody>
					{initialLoad ? (
						<div className="flex flex-col gap-2">
							<SkeletonLine className="w-3/4" />
							<SkeletonLine className="w-1/2" />
						</div>
					) : models.length > 0 ? (
						<div className="flex flex-wrap gap-1.5">
							{models.map((model) => (
								<span
									className="font-mono text-xs rounded-sm border border-border-panel bg-code-block-background px-1.5 py-0.5"
									key={model}>
									{model}
								</span>
							))}
						</div>
					) : (
						<EmptyState icon="circuit-board">
							No models permitted for your account.
							<br />
							Contact your administrator to request access.
						</EmptyState>
					)}
				</SectionBody>
			</SectionCard>

			{/* ── Providers ────────────────────────────────────────────── */}
			<SectionCard>
				<SectionHeader count={providers.length} icon="plug" title="Providers" />
				{initialLoad ? (
					<SectionBody className="flex flex-col gap-2">
						<SkeletonLine className="w-2/3" />
						<SkeletonLine className="w-1/2" />
					</SectionBody>
				) : providers.length > 0 ? (
					<div className="divide-y divide-(--vscode-panel-border)">
						{providers.map((provider) => (
							<div className="flex items-center gap-2 px-3 py-2" key={`${provider.name}-${provider.model ?? ""}`}>
								<StatusDot health={provider.enabled ? "ok" : "unknown"} />
								<div className="flex flex-col min-w-0">
									<span className="text-sm text-foreground truncate">{provider.name}</span>
									{provider.model ? (
										<span className="font-mono text-xs text-description truncate">{provider.model}</span>
									) : null}
								</div>
								<span className="ml-auto text-xs text-description">
									{provider.enabled ? "Enabled" : "Disabled"}
								</span>
							</div>
						))}
					</div>
				) : (
					<SectionBody>
						<EmptyState icon="plug">No providers assigned to your account.</EmptyState>
					</SectionBody>
				)}
			</SectionCard>

			{/* ── Quota ────────────────────────────────────────────────── */}
			<SectionCard>
				<SectionHeader icon="dashboard" title="Quota" />
				<SectionBody className="flex flex-col gap-2">
					{initialLoad ? (
						<SkeletonLine className="w-full" />
					) : (
						<>
							{usagePercent !== null ? (
								<>
									<div className="flex items-baseline justify-between text-xs">
										<span className="text-foreground">
											{formatNumber(ownUsage ?? 0)} <span className="text-description">used</span>
										</span>
										<span className="text-description">of {formatNumber(quotaLimit ?? 0)}</span>
									</div>
									<Progress className="h-1.5" value={usagePercent} />
								</>
							) : quotaLimit !== null ? (
								<div className="text-sm text-foreground">
									Project limit: <span className="font-medium">{formatNumber(quotaLimit)}</span>
								</div>
							) : (
								<div className="text-xs text-description">No usage recorded for your project yet.</div>
							)}
							{projectId ? (
								<div className="flex items-center gap-1.5 text-xs text-description min-w-0">
									<span className="shrink-0">Project ID</span>
									<CopyableCode value={projectId} />
								</div>
							) : null}
							{usageMap && Object.keys(usageMap).length > 0 ? (
								<details className="group">
									<summary className="cursor-pointer text-xs text-link list-none flex items-center gap-1">
										<span
											aria-hidden
											className="codicon codicon-chevron-right !text-xs group-open:rotate-90 transition-transform"
										/>
										Raw usage data
									</summary>
									<pre className="font-mono text-xs overflow-auto p-2.5 mt-1.5 mb-0 rounded-sm bg-code-block-background border border-border-panel">
										{JSON.stringify(usageMap, null, 2)}
									</pre>
								</details>
							) : null}
						</>
					)}
				</SectionBody>
			</SectionCard>

			{/* Fallback sign-out for narrow reachability / keyboard users */}
			<VSCodeButton appearance="secondary" className="w-full" onClick={() => handleSignOut()}>
				Log out
			</VSCodeButton>
		</div>
	)
})

AxgateAccountView.displayName = "AxgateAccountView"

function healthFromStatus(status?: string): Health {
	if (!status) {
		return "unknown"
	}
	const normalized = status.toLowerCase()
	if (["ok", "healthy", "up", "green"].includes(normalized)) {
		return "ok"
	}
	if (["degraded", "warning", "yellow"].includes(normalized)) {
		return "warning"
	}
	return "error"
}

function healthLabel(health: Health, raw?: string): string {
	switch (health) {
		case "ok":
			return "Gateway healthy"
		case "warning":
			return `Gateway degraded${raw ? ` (${raw})` : ""}`
		case "error":
			return `Gateway unhealthy${raw ? ` (${raw})` : ""}`
		default:
			return "Status unknown"
	}
}

function formatNumber(value: number): string {
	return new Intl.NumberFormat().format(value)
}

function tryParseJson(value: string): unknown {
	try {
		return JSON.parse(value)
	} catch {
		return value
	}
}
