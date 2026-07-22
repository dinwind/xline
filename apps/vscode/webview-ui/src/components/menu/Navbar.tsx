import { IntentEvent } from "@shared/proto/cline/ui"
import { HistoryIcon, type LucideIcon, PlusIcon, PuzzleIcon, SettingsIcon, UserCircleIcon } from "lucide-react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TaskServiceClient, UiServiceClient } from "@/services/grpc-client"
import { useExtensionState } from "../../context/ExtensionStateContext"

type NavTab = {
	id: string
	name: string
	tooltip: string
	navigate: () => void
	icon?: LucideIcon
	/** Prefer VS Code codicon when set (more reliable in the webview chrome). */
	codicon?: string
}

export const Navbar = () => {
	const {
		navigateToHistory,
		navigateToSettings,
		navigateToAccount,
		navigateToFeedback,
		navigateToMarketplace,
		navigateToChat,
	} = useExtensionState()

	const tabs = useMemo<NavTab[]>(
		() => [
			{
				id: "chat",
				name: "Chat",
				tooltip: "New Task",
				icon: PlusIcon,
				navigate: () => {
					UiServiceClient.trackIntent(
						IntentEvent.create({
							action: "new_task_clicked",
							source: "navbar",
						}),
					).catch((error) => console.error("Failed to track new task click:", error))
					TaskServiceClient.clearTask({})
						.catch((error) => {
							console.error("Failed to clear task:", error)
						})
						.finally(() => navigateToChat())
				},
			},
			{
				id: "customize",
				name: "Customize",
				tooltip: "Customize",
				icon: PuzzleIcon,
				navigate: navigateToMarketplace,
			},
			{
				id: "history",
				name: "History",
				tooltip: "History",
				icon: HistoryIcon,
				navigate: navigateToHistory,
			},
			{
				id: "account",
				name: "Account",
				tooltip: "Account",
				icon: UserCircleIcon,
				navigate: navigateToAccount,
			},
			{
				id: "feedback",
				name: "Feedback",
				tooltip: "Feedback",
				// Codicon matches VS Code “feedback” glyph; stays visible in sidebar chrome.
				codicon: "feedback",
				navigate: () => navigateToFeedback("list"),
			},
			{
				id: "settings",
				name: "Settings",
				tooltip: "Settings",
				icon: SettingsIcon,
				navigate: navigateToSettings,
			},
		],
		[navigateToAccount, navigateToChat, navigateToFeedback, navigateToHistory, navigateToMarketplace, navigateToSettings],
	)

	return (
		<nav
			className="flex-none flex justify-end bg-background gap-1.5 py-1 pr-3 pl-2 z-50 border-none items-center w-full"
			id="cline-navbar-container">
			{tabs.map((tab) => (
				<Tooltip key={`navbar-tooltip-${tab.id}`}>
					<TooltipContent side="bottom">{tab.tooltip}</TooltipContent>
					<TooltipTrigger asChild>
						<Button
							aria-label={tab.tooltip}
							className="p-0 h-7 w-7 shrink-0"
							data-testid={`tab-${tab.id}`}
							onClick={() => tab.navigate()}
							size="icon"
							variant="icon">
							{tab.codicon ? (
								<span aria-hidden className={`codicon codicon-${tab.codicon} text-[16px] leading-none`} />
							) : tab.icon ? (
								<tab.icon className="stroke-[1.5]" size={18} />
							) : null}
						</Button>
					</TooltipTrigger>
				</Tooltip>
			))}
		</nav>
	)
}
