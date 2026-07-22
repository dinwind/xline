import { CreateFeedbackRequest, FeedbackAttachmentUpload } from "@shared/proto/cline/feedback"
import { VSCodeButton, VSCodeTextArea, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useEffect, useMemo, useState } from "react"
import { FeedbackServiceClient } from "@/services/grpc-client"
import { AttachmentDropzone, type LocalAttachment } from "./AttachmentDropzone"
import { ContextChecklist, type ContextField } from "./ContextChecklist"

type FeedbackNewFormProps = {
	contextFields: ContextField[]
	accountDisplay?: string
	accountEmail?: string
	onCancel: () => void
	onCreated: (number: number) => void
}

const TYPES = [
	{ id: "BUG", label: "Bug" },
	{ id: "FEATURE", label: "Feature" },
	{ id: "QUESTION", label: "Question" },
] as const

export function FeedbackNewForm({ contextFields, accountDisplay, accountEmail, onCancel, onCreated }: FeedbackNewFormProps) {
	const [type, setType] = useState<(typeof TYPES)[number]["id"]>("BUG")
	const [title, setTitle] = useState("")
	const [body, setBody] = useState("")
	const [attachments, setAttachments] = useState<LocalAttachment[]>([])
	const [attachError, setAttachError] = useState("")
	const [selectedKeys, setSelectedKeys] = useState<string[]>(() => contextFields.map((f) => f.key))
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState("")

	useEffect(() => {
		setSelectedKeys(contextFields.map((f) => f.key))
	}, [contextFields])

	const selectedContextJson = useMemo(() => {
		const obj: Record<string, string> = {}
		for (const field of contextFields) {
			const required = field.required !== false
			if ((required || selectedKeys.includes(field.key)) && field.value) {
				obj[field.key] = field.value
			}
		}
		return JSON.stringify(obj)
	}, [contextFields, selectedKeys])

	const accountLabel = accountDisplay || accountEmail || "Signed-in Axline account"
	const canSubmit = Boolean(title.trim() && body.trim()) && !submitting

	const submit = async () => {
		if (!canSubmit) {
			return
		}
		setSubmitting(true)
		setError("")
		try {
			const response = await FeedbackServiceClient.createFeedback(
				CreateFeedbackRequest.create({
					type,
					title: title.trim(),
					body: body.trim(),
					clientContextJson: selectedContextJson,
					attachments: attachments.map((a) =>
						FeedbackAttachmentUpload.create({
							fileName: a.fileName,
							mimeType: a.mimeType,
							data: a.data,
						}),
					),
				}),
			)
			if (response.error || !response.item) {
				setError(response.error || "Submit failed")
				return
			}
			onCreated(response.item.number)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Submit failed")
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="flex flex-col gap-3">
			<button className="self-start text-xs text-(--vscode-textLink-foreground)" onClick={onCancel} type="button">
				← Back to list
			</button>
			<h2 className="m-0 text-base font-semibold">Report issue</h2>

			<div className="flex items-start gap-2 rounded border border-(--vscode-widget-border) px-3 py-2 text-xs">
				<span aria-hidden className="codicon codicon-account !text-sm mt-px shrink-0" />
				<div className="min-w-0">
					<div className="font-medium">Submitting as</div>
					<div className="text-(--vscode-descriptionForeground) break-all">{accountLabel}</div>
					{accountDisplay && accountEmail && accountDisplay !== accountEmail ? (
						<div className="text-(--vscode-descriptionForeground) break-all">{accountEmail}</div>
					) : null}
				</div>
			</div>

			<div className="flex rounded border border-(--vscode-widget-border) overflow-hidden w-fit">
				{TYPES.map((t) => (
					<button
						className={`px-3 py-1 text-xs ${type === t.id ? "bg-(--vscode-button-background) text-(--vscode-button-foreground)" : ""}`}
						key={t.id}
						onClick={() => setType(t.id)}
						type="button">
						{t.label}
					</button>
				))}
			</div>

			<VSCodeTextField
				className="w-full"
				onInput={(event) => setTitle((event.target as HTMLInputElement).value)}
				placeholder="Short summary"
				value={title}>
				Title
			</VSCodeTextField>

			<label className="flex flex-col gap-1 text-xs">
				<span>Description</span>
				<VSCodeTextArea
					className="w-full"
					onInput={(event) => setBody((event.target as HTMLTextAreaElement).value)}
					placeholder="Steps to reproduce, expected vs actual…"
					rows={6}
					value={body}
				/>
			</label>

			<AttachmentDropzone
				attachments={attachments}
				error={attachError}
				onChange={(next) => {
					setAttachError("")
					setAttachments(next)
				}}
				onError={setAttachError}
			/>

			<ContextChecklist fields={contextFields} onChange={setSelectedKeys} selectedKeys={selectedKeys} />

			<div className="flex items-center gap-2 text-xs text-(--vscode-descriptionForeground)">
				<span aria-hidden className="codicon codicon-lock !text-xs" />
				<span>Default private: only you and admins can see this</span>
			</div>

			{error ? <p className="m-0 text-xs text-(--vscode-errorForeground)">{error}</p> : null}

			<div className="flex gap-2">
				<VSCodeButton appearance="primary" disabled={!canSubmit} onClick={() => void submit()}>
					{submitting ? "Submitting…" : "Submit feedback"}
				</VSCodeButton>
				<VSCodeButton appearance="secondary" disabled={submitting} onClick={onCancel}>
					Cancel
				</VSCodeButton>
			</div>
		</div>
	)
}
