import type { Boolean, EmptyRequest } from "@shared/proto/cline/common"
import { useCallback, useEffect } from "react"
import AccountView from "./components/account/AccountView"
import ChatView from "./components/chat/ChatView"
import FeedbackView from "./components/feedback/FeedbackView"
import HistoryView from "./components/history/HistoryView"
import MarketplaceView from "./components/marketplace/MarketplaceView"
import McpView from "./components/mcp/configuration/McpConfigurationView"
import { Navbar } from "./components/menu/Navbar"
import { openClinePassSubscriptionIfPending } from "./components/onboarding/clinePassSubscribe"
import SettingsView from "./components/settings/SettingsView"
import WorktreesView from "./components/worktrees/WorktreesView"
import { useClineAuth } from "./context/ClineAuthContext"
import { useExtensionState } from "./context/ExtensionStateContext"
import { useShowNavbar } from "./context/PlatformContext"
import { Providers } from "./Providers"
import { StateServiceClient, UiServiceClient } from "./services/grpc-client"

const AppContent = () => {
	const {
		didHydrateState,
		showWelcome,
		setShowWelcome,
		shouldShowAnnouncement,
		showMarketplace,
		showMcp,
		mcpTab,
		showSettings,
		settingsTargetSection,
		showHistory,
		showAccount,
		showFeedback,
		feedbackInitialMode,
		showWorktrees,
		showAnnouncement,
		setShowAnnouncement,
		setShouldShowAnnouncement,
		closeMcpView,
		navigateToHistory,
		hideSettings,
		hideHistory,
		hideAccount,
		hideFeedback,
		hideWorktrees,
		closeMarketplaceView,
		hideAnnouncement,
	} = useExtensionState()

	const { clineUser, organizations, activeOrganization } = useClineAuth()
	const showNavbar = useShowNavbar()

	const showUpdateAnnouncementModal = useCallback(() => {
		setShowAnnouncement(true)
		UiServiceClient.onDidShowAnnouncement({} as EmptyRequest)
			.then((response: Boolean) => {
				setShouldShowAnnouncement(response.value)
			})
			.catch((error) => {
				console.error("Failed to acknowledge announcement:", error)
			})
	}, [setShouldShowAnnouncement, setShowAnnouncement])

	useEffect(() => {
		if (!didHydrateState || showWelcome || !shouldShowAnnouncement || showAnnouncement) {
			return
		}
		showUpdateAnnouncementModal()
	}, [didHydrateState, showWelcome, shouldShowAnnouncement, showAnnouncement, showUpdateAnnouncementModal])

	// Open the ClinePass subscription page once auth completes.
	useEffect(() => {
		if (clineUser?.uid) {
			openClinePassSubscriptionIfPending(clineUser.appBaseUrl)
		}
	}, [clineUser?.uid, clineUser?.appBaseUrl])

	const completeWelcomeView = useCallback(() => {
		return StateServiceClient.setWelcomeViewCompleted({ value: true })
			.then(() => setShowWelcome(false))
			.catch((error) => {
				console.error("Failed to complete welcome view:", error)
			})
	}, [setShowWelcome])

	// After first-time sign-in, leave the welcome login screen and open chat.
	useEffect(() => {
		if (!didHydrateState || !showWelcome || !clineUser?.uid) {
			return
		}

		void completeWelcomeView()
	}, [didHydrateState, showWelcome, clineUser?.uid, completeWelcomeView])

	if (!didHydrateState) {
		return (
			<div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-background text-foreground">
				<span aria-hidden className="codicon codicon-loading animate-spin text-2xl" />
				<p className="text-sm text-(--vscode-descriptionForeground)">Loading Axline…</p>
			</div>
		)
	}

	if (showWelcome) {
		return (
			<AccountView
				activeOrganization={activeOrganization}
				clineUser={clineUser}
				isWelcomeFlow
				onDone={() => {
					void completeWelcomeView()
				}}
				organizations={organizations}
			/>
		)
	}

	return (
		<div className="flex h-screen w-full flex-col">
			{/* Shared chrome: always above Settings/Account/Feedback so Feedback stays between Account and Settings. */}
			{showNavbar ? <Navbar /> : null}
			<div className="relative flex min-h-0 flex-1 flex-col">
				{showSettings && <SettingsView onDone={hideSettings} targetSection={settingsTargetSection} />}
				{showHistory && <HistoryView onDone={hideHistory} />}
				{showMarketplace && <MarketplaceView initialType={mcpTab ? "mcp" : undefined} onDone={closeMarketplaceView} />}
				{showMcp && <McpView initialTab={mcpTab} onDone={closeMcpView} />}
				{showAccount && (
					<AccountView
						activeOrganization={activeOrganization}
						clineUser={clineUser}
						onDone={hideAccount}
						organizations={organizations}
					/>
				)}
				{showFeedback && <FeedbackView initialMode={feedbackInitialMode} onDone={hideFeedback} />}
				{showWorktrees && <WorktreesView onDone={hideWorktrees} />}
				{/* Do not conditionally load ChatView, it's expensive and there's state we don't want to lose (user input, disableInput, askResponse promise, etc.) */}
				<ChatView
					hideAnnouncement={hideAnnouncement}
					isHidden={
						showSettings || showHistory || showMarketplace || showMcp || showAccount || showFeedback || showWorktrees
					}
					showAnnouncement={showAnnouncement}
					showHistoryView={navigateToHistory}
				/>
			</div>
		</div>
	)
}

const App = () => {
	return (
		<Providers>
			<AppContent />
		</Providers>
	)
}

export default App
