import { cn } from "@/lib/utils"

/** Cursor outline icon font glyphs (cursor-icons-outline.woff2). */
const CURSOR_ICON_GLYPHS = {
	paperclip: "\uEC54",
} as const

export type CursorIconName = keyof typeof CURSOR_ICON_GLYPHS

type CursorIconProps = {
	name: CursorIconName
	className?: string
	size?: number
}

export const CursorIcon = ({ name, className, size = 13 }: CursorIconProps) => (
	<span
		aria-hidden
		className={cn("cursor-icon inline-flex items-center justify-center leading-none", className)}
		style={{ fontSize: size, width: size, height: size }}>
		{CURSOR_ICON_GLYPHS[name]}
	</span>
)
