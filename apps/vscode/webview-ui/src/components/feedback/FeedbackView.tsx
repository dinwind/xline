import { EmptyRequest } from "@shared/proto/cline/common"
import type { FeedbackDetail, FeedbackListItem } from "@shared/proto/cline/feedback"
import { GetFeedbackRequest, ListFeedbackRequest } from "@shared/proto/cline/feedback"
import { useCallback, useEffect, useState } from "react"
import ViewHeader from "@/components/common/ViewHeader"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { FeedbackServiceClient } from "@/services/grpc-client"
import type { ContextField } from "./ContextChecklist"
import { FeedbackDetailView } from "./FeedbackDetailView"
import { FeedbackListView } from "./FeedbackListView"
import { FeedbackNewForm } from "./FeedbackNewForm"
import { LoginGate } from "./LoginGate"

type FeedbackViewProps = {
	onDone: () => void
	initialMode?: "list" | "new"
}

type Screen = { kind: "list" } | { kind: "new" } | { kind: "detail"; number: number }

export default function FeedbackView({ onDone, initialMode = "list" }: FeedbackViewProps) {
	const { environment } = useExtensionState()
	const [authenticated, setAuthenticated] = useState(false)
	const [authChecked, setAuthChecked] = useState(false)
	const [accountDisplay, setAccountDisplay] = useState("")
	const [accountEmail, setAccountEmail] = useState("")
	const [screen, setScreen] = useState<Screen>(initialMode === "new" ? { kind: "new" } : { kind: "list" })
	const [scope, setScope] = useState<"mine" | "public">("mine")
	const [items, setItems] = useState<FeedbackListItem[]>([])
	const [listLoading, setListLoading] = useState(false)
	const [listError, setListError] = useState("")
	const [detail, setDetail] = useState<FeedbackDetail | null>(null)
	const [contextFields, setContextFields] = useState<ContextField[]>([])

	const refreshAuth = useCallback(async () => {
		try {
			const state = await FeedbackServiceClient.getFeedbackAuthState(EmptyRequest.create({}))
			setAuthenticated(state.authenticated)
			setAccountDisplay(state.accountDisplay || "")
			setAccountEmail(state.accountEmail || "")
		} catch {
			setAuthenticated(false)
			setAccountDisplay("")
			setAccountEmail("")
		} finally {
			setAuthChecked(true)
		}
	}, [])

	const loadContext = useCallback(async () => {
		try {
			const ctx = await FeedbackServiceClient.getFeedbackClientContext(EmptyRequest.create({}))
			if (ctx.error) {
				return
			}
			setContextFields([
				{ key: "axlineVersion", label: "Axline", value: ctx.axlineVersion, required: true },
				{ key: "vscodeVersion", label: "VS Code / host", value: ctx.vscodeVersion, required: true },
				{ key: "uiKind", label: "UI kind", value: ctx.uiKind, required: true },
				{ key: "platform", label: "Platform", value: ctx.platform, required: true },
				{ key: "arch", label: "Arch", value: ctx.arch, required: true },
				{ key: "appName", label: "App", value: ctx.appName, required: true },
				{ key: "language", label: "Language", value: ctx.language, required: true },
				{ key: "extensionMode", label: "Mode", value: ctx.extensionMode, required: true },
			])
		} catch {
			// ignore
		}
	}, [])

	const loadList = useCallback(async () => {
		setListLoading(true)
		setListError("")
		try {
			const response = await FeedbackServiceClient.listFeedback(
				ListFeedbackRequest.create({
					scope,
					page: 1,
					limit: 50,
				}),
			)
			if (response.error) {
				setListError(response.error)
				setItems([])
				return
			}
			setItems(response.items)
		} catch (err) {
			setListError(err instanceof Error ? err.message : "Failed to load feedback")
			setItems([])
		} finally {
			setListLoading(false)
		}
	}, [scope])

	const openDetail = useCallback(async (number: number) => {
		setScreen({ kind: "detail", number })
		try {
			const response = await FeedbackServiceClient.getFeedback(GetFeedbackRequest.create({ number }))
			if (response.error || !response.item) {
				setListError(response.error || "Feedback not found")
				setDetail(null)
				return
			}
			setDetail(response.item)
		} catch (err) {
			setListError(err instanceof Error ? err.message : "Failed to load detail")
			setDetail(null)
		}
	}, [])

	useEffect(() => {
		void refreshAuth()
		void loadContext()
	}, [refreshAuth, loadContext])

	useEffect(() => {
		if (authenticated && screen.kind === "list") {
			void loadList()
		}
	}, [authenticated, screen.kind, loadList])

	useEffect(() => {
		setScreen(initialMode === "new" ? { kind: "new" } : { kind: "list" })
	}, [initialMode])

	return (
		<div className="absolute inset-0 flex flex-col overflow-hidden bg-background">
			<ViewHeader environment={environment} onDone={onDone} title="Feedback" />
			<div className="grow overflow-y-auto px-4 py-3">
				{!authChecked ? (
					<p className="m-0 text-sm text-(--vscode-descriptionForeground)">Loading…</p>
				) : !authenticated ? (
					<LoginGate onLogin={() => void refreshAuth()} />
				) : screen.kind === "new" ? (
					<FeedbackNewForm
						accountDisplay={accountDisplay}
						accountEmail={accountEmail}
						contextFields={contextFields}
						onCancel={() => setScreen({ kind: "list" })}
						onCreated={(number) => {
							void openDetail(number)
						}}
					/>
				) : screen.kind === "detail" && detail ? (
					<FeedbackDetailView
						item={detail}
						onBack={() => {
							setDetail(null)
							setScreen({ kind: "list" })
						}}
						onUpdated={setDetail}
					/>
				) : (
					<FeedbackListView
						error={listError}
						items={items}
						loading={listLoading}
						onOpenDetail={(number) => void openDetail(number)}
						onOpenNew={() => setScreen({ kind: "new" })}
						onRefresh={() => void loadList()}
						onScopeChange={setScope}
						scope={scope}
					/>
				)}
			</div>
		</div>
	)
}
