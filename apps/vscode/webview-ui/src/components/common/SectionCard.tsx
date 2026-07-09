import { type HTMLAttributes, type ReactNode, useCallback, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Native VS Code styled building blocks shared across Axline views.
 * Everything is driven by VS Code theme variables so it adapts to any theme.
 */

type SectionCardProps = HTMLAttributes<HTMLDivElement> & {
	children: ReactNode
}

export const SectionCard = ({ className, children, ...props }: SectionCardProps) => (
	<div
		className={cn("rounded-md border border-border-panel bg-(--vscode-editorWidget-background) overflow-hidden", className)}
		{...props}>
		{children}
	</div>
)

type SectionHeaderProps = {
	icon?: string
	title: ReactNode
	/** Small counter or badge rendered right after the title */
	count?: number
	/** Right-aligned actions (buttons, links) */
	actions?: ReactNode
	className?: string
}

export const SectionHeader = ({ icon, title, count, actions, className }: SectionHeaderProps) => (
	<div className={cn("flex items-center gap-2 px-3 py-2 border-b border-border-panel", className)}>
		{icon ? <span aria-hidden className={`codicon codicon-${icon} !text-sm text-icon-foreground`} /> : null}
		<span className="text-sm font-semibold text-foreground">{title}</span>
		{typeof count === "number" ? (
			<span className="text-xs rounded-full px-1.5 bg-badge-background text-badge-foreground leading-4">{count}</span>
		) : null}
		<div className="ml-auto flex items-center gap-1">{actions}</div>
	</div>
)

export const SectionBody = ({ className, children, ...props }: SectionCardProps) => (
	<div className={cn("px-3 py-2.5", className)} {...props}>
		{children}
	</div>
)

export type Health = "ok" | "warning" | "error" | "unknown"

const DOT_COLOR: Record<Health, string> = {
	ok: "bg-success",
	warning: "bg-warning",
	error: "bg-error-icon",
	unknown: "bg-description",
}

export const StatusDot = ({ health, pulse }: { health: Health; pulse?: boolean }) => (
	<span className="relative inline-flex size-2 shrink-0">
		{pulse && health === "ok" ? (
			<span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping", DOT_COLOR[health])} />
		) : null}
		<span className={cn("relative inline-flex size-2 rounded-full", DOT_COLOR[health])} />
	</span>
)

type IconButtonProps = {
	icon: string
	title: string
	onClick?: () => void
	disabled?: boolean
	spinning?: boolean
	className?: string
}

/** Toolbar-style icon button, like VS Code editor title actions. */
export const IconButton = ({ icon, title, onClick, disabled, spinning, className }: IconButtonProps) => (
	<button
		aria-label={title}
		className={cn(
			"inline-flex items-center justify-center size-[22px] rounded-xs border-0 bg-transparent p-0",
			"text-icon-foreground cursor-pointer hover:bg-toolbar-hover disabled:opacity-50 disabled:cursor-default",
			className,
		)}
		disabled={disabled}
		onClick={onClick}
		title={title}
		type="button">
		<span aria-hidden className={cn(`codicon codicon-${icon} !text-sm`, spinning && "animate-spin")} />
	</button>
)

/** Monospace value with a copy-to-clipboard affordance. */
export const CopyableCode = ({ value, className }: { value: string; className?: string }) => {
	const [copied, setCopied] = useState(false)

	const copy = useCallback(() => {
		navigator.clipboard
			?.writeText(value)
			.then(() => {
				setCopied(true)
				setTimeout(() => setCopied(false), 1500)
			})
			.catch(() => {})
	}, [value])

	return (
		<button
			className={cn(
				"group inline-flex items-center gap-1.5 max-w-full rounded-xs border-0 bg-transparent p-0 m-0",
				"cursor-pointer text-description hover:text-foreground",
				className,
			)}
			onClick={copy}
			title={copied ? "Copied!" : `Copy: ${value}`}
			type="button">
			<code className="font-mono text-xs truncate">{value}</code>
			<span
				aria-hidden
				className={cn(
					"codicon !text-[11px] shrink-0",
					copied ? "codicon-check text-success" : "codicon-copy opacity-0 group-hover:opacity-100",
				)}
			/>
		</button>
	)
}

/** Dashed empty-state placeholder with an icon and hint. */
export const EmptyState = ({ icon, children, className }: { icon: string; children: ReactNode; className?: string }) => (
	<div
		className={cn(
			"flex flex-col items-center gap-1.5 rounded-sm border border-dashed border-border-panel",
			"px-3 py-4 text-center",
			className,
		)}>
		<span aria-hidden className={`codicon codicon-${icon} !text-base text-description opacity-70`} />
		<div className="text-xs text-description">{children}</div>
	</div>
)

/** Shimmering placeholder line for loading states. */
export const SkeletonLine = ({ className }: { className?: string }) => (
	<div className={cn("h-3 rounded-xs bg-muted animate-pulse", className)} />
)
