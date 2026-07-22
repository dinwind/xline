import {
	FEEDBACK_ATTACHMENT_ACCEPT,
	FEEDBACK_ATTACHMENT_ACCEPT_LABEL,
	FEEDBACK_MAX_ATTACHMENT_BYTES,
	FEEDBACK_MAX_ATTACHMENT_SIZE_LABEL,
	FEEDBACK_MAX_ATTACHMENTS,
	isFeedbackAllowedMime,
	isFeedbackImageMime,
	resolveFeedbackMime,
} from "@shared/feedback-attachments"
import { useCallback, useRef } from "react"

export type LocalAttachment = {
	id: string
	fileName: string
	mimeType: string
	data: Uint8Array
	previewUrl: string
}

type AttachmentDropzoneProps = {
	attachments: LocalAttachment[]
	onChange: (next: LocalAttachment[]) => void
	error?: string
	onError: (message: string) => void
}

export function AttachmentDropzone({ attachments, onChange, error, onError }: AttachmentDropzoneProps) {
	const inputRef = useRef<HTMLInputElement>(null)

	const addFiles = useCallback(
		async (files: FileList | File[]) => {
			const list = Array.from(files)
			const next = [...attachments]
			for (const file of list) {
				if (next.length >= FEEDBACK_MAX_ATTACHMENTS) {
					onError(`At most ${FEEDBACK_MAX_ATTACHMENTS} attachments are allowed`)
					break
				}
				const mimeType = resolveFeedbackMime(file.name, file.type)
				if (!isFeedbackAllowedMime(mimeType)) {
					onError(`Unsupported file type. Allowed: ${FEEDBACK_ATTACHMENT_ACCEPT_LABEL}`)
					continue
				}
				if (file.size > FEEDBACK_MAX_ATTACHMENT_BYTES) {
					onError(`Attachment exceeds the ${FEEDBACK_MAX_ATTACHMENT_SIZE_LABEL} limit`)
					continue
				}
				const buffer = new Uint8Array(await file.arrayBuffer())
				const previewUrl = isFeedbackImageMime(mimeType)
					? URL.createObjectURL(new Blob([buffer], { type: mimeType }))
					: ""
				next.push({
					id: `${file.name}-${Date.now()}-${Math.random()}`,
					fileName: file.name,
					mimeType,
					data: buffer,
					previewUrl,
				})
			}
			onChange(next)
		},
		[attachments, onChange, onError],
	)

	return (
		<div className="flex flex-col gap-2">
			<div
				className="flex flex-col items-center justify-center gap-1 rounded border border-dashed border-(--vscode-widget-border) px-3 py-4 text-center text-xs text-(--vscode-descriptionForeground)"
				onDragOver={(event) => event.preventDefault()}
				onDrop={(event) => {
					event.preventDefault()
					if (event.dataTransfer.files?.length) {
						void addFiles(event.dataTransfer.files)
					}
				}}
				onPaste={(event) => {
					const files = Array.from(event.clipboardData.items)
						.map((item) => item.getAsFile())
						.filter((f): f is File => Boolean(f))
					if (files.length) {
						event.preventDefault()
						void addFiles(files)
					}
				}}>
				<p className="m-0">Drop, paste, or choose screenshots, logs, and documents</p>
				<p className="m-0">
					{FEEDBACK_ATTACHMENT_ACCEPT_LABEL} · max {FEEDBACK_MAX_ATTACHMENTS} × {FEEDBACK_MAX_ATTACHMENT_SIZE_LABEL}
				</p>
				<button
					className="mt-1 text-(--vscode-textLink-foreground)"
					onClick={() => inputRef.current?.click()}
					type="button">
					Choose files
				</button>
				<input
					accept={FEEDBACK_ATTACHMENT_ACCEPT}
					className="hidden"
					multiple
					onChange={(event) => {
						if (event.target.files?.length) {
							void addFiles(event.target.files)
						}
						event.target.value = ""
					}}
					ref={inputRef}
					type="file"
				/>
			</div>
			{error ? <p className="m-0 text-xs text-(--vscode-errorForeground)">{error}</p> : null}
			{attachments.length ? (
				<ul className="m-0 flex list-none flex-wrap gap-2 p-0">
					{attachments.map((att) => (
						<li className="relative" key={att.id}>
							{att.previewUrl ? (
								<img alt={att.fileName} className="h-16 w-16 rounded object-cover" src={att.previewUrl} />
							) : (
								<div className="flex h-16 min-w-16 max-w-40 items-center justify-center rounded border border-(--vscode-widget-border) bg-(--vscode-editor-background) px-2 text-[10px] leading-tight text-(--vscode-descriptionForeground)">
									<span className="truncate" title={att.fileName}>
										{att.fileName}
									</span>
								</div>
							)}
							<button
								aria-label={`Remove ${att.fileName}`}
								className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-(--vscode-inputValidation-errorBackground) text-[10px]"
								onClick={() => {
									if (att.previewUrl) {
										URL.revokeObjectURL(att.previewUrl)
									}
									onChange(attachments.filter((a) => a.id !== att.id))
								}}
								type="button">
								×
							</button>
						</li>
					))}
				</ul>
			) : null}
		</div>
	)
}
