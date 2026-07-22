import type { FeedbackDetail } from "@shared/proto/cline/feedback"
import { AddFeedbackCommentRequest, GetFeedbackAttachmentRequest } from "@shared/proto/cline/feedback"
import { VSCodeButton, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react"
import { useEffect, useState } from "react"
import { FeedbackServiceClient } from "@/services/grpc-client"
import { StatusBadge } from "./StatusBadge"

type FeedbackDetailViewProps = {
	item: FeedbackDetail
	onBack: () => void
	onUpdated: (item: FeedbackDetail) => void
	onCheckForUpdates?: () => void
}

export function FeedbackDetailView({ item, onBack, onUpdated, onCheckForUpdates }: FeedbackDetailViewProps) {
	const [comment, setComment] = useState("")
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState("")
	const [previews, setPreviews] = useState<Record<string, string>>({})

	useEffect(() => {
		let cancelled = false
		const load = async () => {
			const next: Record<string, string> = {}
			for (const att of item.attachments) {
				try {
					const response = await FeedbackServiceClient.getFeedbackAttachment(
						GetFeedbackAttachmentRequest.create({
							feedbackId: item.id,
							attachmentId: att.id,
						}),
					)
					if (response.error || !response.data?.length) {
						continue
					}
					// Copy into a fresh Uint8Array so BlobPart gets ArrayBuffer (not SharedArrayBuffer).
					const bytes = new Uint8Array(response.data)
					const blob = new Blob([bytes], { type: response.mimeType || att.mimeType })
					next[att.id] = URL.createObjectURL(blob)
				} catch {
					// leave missing preview
				}
			}
			if (!cancelled) {
				setPreviews((prev) => {
					for (const url of Object.values(prev)) {
						URL.revokeObjectURL(url)
					}
					return next
				})
			} else {
				for (const url of Object.values(next)) {
					URL.revokeObjectURL(url)
				}
			}
		}
		void load()
		return () => {
			cancelled = true
		}
	}, [item.id, item.attachments])

	const submitComment = async () => {
		if (!comment.trim() || submitting) {
			return
		}
		setSubmitting(true)
		setError("")
		try {
			const response = await FeedbackServiceClient.addFeedbackComment(
				AddFeedbackCommentRequest.create({
					number: item.number,
					body: comment.trim(),
				}),
			)
			if (response.error || !response.item) {
				setError(response.error || "Failed to add comment")
				return
			}
			setComment("")
			onUpdated(response.item)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to add comment")
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="flex flex-col gap-3">
			<button className="self-start text-xs text-(--vscode-textLink-foreground)" onClick={onBack} type="button">
				← Back to list
			</button>

			<div className="flex flex-wrap items-center gap-2">
				<span className="text-xs text-(--vscode-descriptionForeground)">#{item.number}</span>
				<StatusBadge label={item.statusLabel} status={item.status} />
				<span className="text-xs text-(--vscode-descriptionForeground)">{item.visibility}</span>
			</div>

			<h2 className="m-0 text-base font-semibold leading-snug">{item.title}</h2>

			{item.status === "NEEDS_INFO" ? (
				<div className="rounded border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs">
					The team needs more information — please reply below.
				</div>
			) : null}

			{item.status === "DONE" && item.releaseVersion ? (
				<div className="flex flex-col gap-2 rounded border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs">
					<span>Fixed in v{item.releaseVersion}</span>
					{onCheckForUpdates ? (
						<VSCodeButton appearance="secondary" onClick={onCheckForUpdates}>
							Check for Updates
						</VSCodeButton>
					) : null}
				</div>
			) : null}

			{item.externalPrUrl ? (
				<a
					className="text-xs text-(--vscode-textLink-foreground)"
					href={item.externalPrUrl}
					rel="noreferrer"
					target="_blank">
					Open related PR
				</a>
			) : null}

			<p className="m-0 whitespace-pre-wrap text-sm">{item.body}</p>

			{item.attachments.length ? (
				<div className="flex flex-wrap gap-2">
					{item.attachments.map((att) => {
						const url = previews[att.id]
						const isImage = (att.mimeType || "").startsWith("image/")
						if (url && isImage) {
							return (
								<img
									alt={att.displayName}
									className="max-h-40 max-w-full rounded border border-(--vscode-widget-border)"
									key={att.id}
									src={url}
								/>
							)
						}
						if (url) {
							return (
								<a
									className="inline-flex max-w-full items-center gap-1 rounded border border-(--vscode-widget-border) px-2 py-1 text-xs text-(--vscode-textLink-foreground)"
									download={att.displayName}
									href={url}
									key={att.id}
									rel="noreferrer"
									title={att.displayName}>
									<span aria-hidden className="codicon codicon-file !text-xs" />
									<span className="truncate">{att.displayName || "attachment"}</span>
								</a>
							)
						}
						return (
							<span className="text-xs text-(--vscode-descriptionForeground)" key={att.id}>
								{att.displayName}
							</span>
						)
					})}
				</div>
			) : null}

			<div className="flex flex-col gap-2">
				<h3 className="m-0 text-sm font-medium">Discussion</h3>
				{!item.comments.length ? (
					<p className="m-0 text-xs text-(--vscode-descriptionForeground)">No comments yet.</p>
				) : (
					<ul className="m-0 flex list-none flex-col gap-2 p-0">
						{item.comments.map((c) => (
							<li className="rounded border border-(--vscode-widget-border) px-2.5 py-2" key={c.id}>
								<div className="mb-1 flex items-center gap-2 text-[11px] text-(--vscode-descriptionForeground)">
									<span>{c.authorDisplay || c.authorType}</span>
									{c.authorType === "AI_AGENT" || c.authorType === "SYSTEM" ? (
										<span className="rounded bg-violet-500/25 px-1 text-violet-200">AI</span>
									) : null}
									<span>{formatDate(c.createdAt)}</span>
								</div>
								<p className="m-0 whitespace-pre-wrap text-sm">{c.body}</p>
							</li>
						))}
					</ul>
				)}
			</div>

			{item.canComment ? (
				<div className="flex flex-col gap-2">
					<VSCodeTextArea
						className="w-full"
						onInput={(event) => setComment((event.target as HTMLTextAreaElement).value)}
						placeholder="Add a comment…"
						rows={3}
						value={comment}
					/>
					{error ? <p className="m-0 text-xs text-(--vscode-errorForeground)">{error}</p> : null}
					<VSCodeButton
						appearance="primary"
						disabled={!comment.trim() || submitting}
						onClick={() => void submitComment()}>
						{submitting ? "Sending…" : "Comment"}
					</VSCodeButton>
				</div>
			) : null}
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
