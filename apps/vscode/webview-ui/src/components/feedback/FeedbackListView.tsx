import type { FeedbackListItem } from "@shared/proto/cline/feedback"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { StatusBadge } from "./StatusBadge"

type FeedbackListViewProps = {
	scope: "mine" | "public"
	items: FeedbackListItem[]
	loading: boolean
	error?: string
	onScopeChange: (scope: "mine" | "public") => void
	onRefresh: () => void
	onOpenNew: () => void
	onOpenDetail: (number: number) => void
}

export function FeedbackListView({
	scope,
	items,
	loading,
	error,
	onScopeChange,
	onRefresh,
	onOpenNew,
	onOpenDetail,
}: FeedbackListViewProps) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<div className="flex rounded border border-(--vscode-widget-border) overflow-hidden">
					<button
						className={`px-3 py-1 text-xs ${scope === "mine" ? "bg-(--vscode-button-background) text-(--vscode-button-foreground)" : ""}`}
						onClick={() => onScopeChange("mine")}
						type="button">
						Mine
					</button>
					<button
						className={`px-3 py-1 text-xs ${scope === "public" ? "bg-(--vscode-button-background) text-(--vscode-button-foreground)" : ""}`}
						onClick={() => onScopeChange("public")}
						type="button">
						Public
					</button>
				</div>
				<div className="grow" />
				<VSCodeButton appearance="secondary" disabled={loading} onClick={onRefresh}>
					Refresh
				</VSCodeButton>
				<VSCodeButton appearance="primary" onClick={onOpenNew}>
					Report issue
				</VSCodeButton>
			</div>

			{error ? (
				<div className="rounded border border-(--vscode-inputValidation-errorBorder) bg-(--vscode-inputValidation-errorBackground)/30 px-3 py-2 text-xs">
					{error}
					<button className="ml-2 text-(--vscode-textLink-foreground)" onClick={onRefresh} type="button">
						Retry
					</button>
				</div>
			) : null}

			{loading && !items.length ? <p className="m-0 text-sm text-(--vscode-descriptionForeground)">Loading…</p> : null}

			{!loading && !error && !items.length ? (
				<p className="m-0 text-sm text-(--vscode-descriptionForeground)">
					{scope === "mine" ? "No feedback yet. Report an issue to get started." : "No public feedback for Axline."}
				</p>
			) : null}

			<ul className="m-0 flex list-none flex-col gap-2 p-0">
				{items.map((item) => {
					const needsInfo = item.status === "NEEDS_INFO"
					return (
						<li key={item.id}>
							<button
								className={`w-full rounded border px-3 py-2 text-left ${
									needsInfo
										? "border-l-4 border-l-amber-500 border-(--vscode-widget-border) bg-amber-500/10"
										: "border-(--vscode-widget-border)"
								}`}
								onClick={() => onOpenDetail(item.number)}
								type="button">
								<div className="flex items-start gap-2">
									<span className="text-xs text-(--vscode-descriptionForeground)">#{item.number}</span>
									<span className="grow text-sm font-medium leading-snug">{item.title}</span>
									<StatusBadge label={item.statusLabel} status={item.status} />
								</div>
								<div className="mt-1 text-[11px] text-(--vscode-descriptionForeground)">
									{item.type} · updated {formatDate(item.updatedAt)}
								</div>
							</button>
						</li>
					)
				})}
			</ul>
		</div>
	)
}

function formatDate(value: string): string {
	if (!value) {
		return ""
	}
	try {
		return new Date(value).toLocaleString()
	} catch {
		return value
	}
}
