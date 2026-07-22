const TONE_CLASS: Record<string, string> = {
	muted: "bg-(--vscode-badge-background) text-(--vscode-badge-foreground)",
	info: "bg-(--vscode-button-secondaryBackground) text-(--vscode-button-secondaryForeground)",
	warning: "bg-amber-500/20 text-amber-200 border border-amber-500/40",
	accent: "bg-violet-500/20 text-violet-200 border border-violet-500/40",
	success: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40",
	neutral: "bg-(--vscode-badge-background) text-(--vscode-badge-foreground)",
}

function toneForStatus(status: string): string {
	switch (status) {
		case "OPEN":
		case "REJECTED":
		case "DUPLICATE":
			return "muted"
		case "TRIAGING":
		case "ACCEPTED":
			return "info"
		case "NEEDS_INFO":
			return "warning"
		case "QUEUED":
		case "IMPLEMENTING":
		case "IN_REVIEW":
			return "accent"
		case "DONE":
			return "success"
		default:
			return "neutral"
	}
}

type StatusBadgeProps = {
	status: string
	label: string
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
	const tone = toneForStatus(status)
	return (
		<span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${TONE_CLASS[tone]}`}>
			{label || status}
		</span>
	)
}
