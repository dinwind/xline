import type { ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type ComposerIconButtonProps = {
	"aria-label": string
	"data-testid"?: string
	disabled?: boolean
	onClick?: () => void
	tooltip: string
	children: ReactNode
}

export const ComposerIconButton = ({
	"aria-label": ariaLabel,
	"data-testid": testId,
	disabled,
	onClick,
	tooltip,
	children,
}: ComposerIconButtonProps) => (
	<Tooltip>
		<TooltipContent>{tooltip}</TooltipContent>
		<TooltipTrigger asChild>
			<button
				aria-label={ariaLabel}
				className={cn(
					"inline-flex items-center justify-center p-0 m-0 bg-transparent border-0",
					"text-icon-foreground opacity-65 hover:opacity-100 transition-opacity",
					"disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40",
				)}
				data-testid={testId}
				disabled={disabled}
				onClick={onClick}
				type="button">
				{children}
			</button>
		</TooltipTrigger>
	</Tooltip>
)
