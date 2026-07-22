import { WebviewProvider } from "./core/webview"
import "./utils/path" // necessary to have access to String.prototype.toPosix

import { HostProvider } from "@/hosts/host-provider"
import { Logger } from "@/shared/services/Logger"
import type { StorageContext } from "@/shared/storage/storage-context"
import { clearOnboardingModelsCache } from "./core/controller/models/getClineOnboardingModels"
import { HookDiscoveryCache } from "./core/hooks/HookDiscoveryCache"
import { HookProcessRegistry } from "./core/hooks/HookProcessRegistry"
import { StateManager } from "./core/storage/StateManager"
import { AgentConfigLoader } from "./core/task/tools/subagent/AgentConfigLoader"
import { ExtensionRegistryInfo } from "./registry"
import { registerVsCodeLmHandler } from "./sdk/vscode-lm/register-vscode-lm"
import { ErrorService } from "./services/error"
import { featureFlagsService } from "./services/feature-flags"
import { ensureHostRegistryInfoReady, getDistinctId } from "./services/logging/distinctId"
import { telemetryService } from "./services/telemetry"
import { PostHogClientProvider } from "./services/telemetry/providers/posthog/PostHogClientProvider"
import { ClineTempManager } from "./services/temp"
import { ShowMessageType } from "./shared/proto/host/window"
import { syncWorker } from "./shared/services/worker/sync"
import { getBlobStoreSettingsFromEnv } from "./shared/services/worker/worker"
import { getLatestAnnouncementId } from "./utils/announcements"
import { arePathsEqual } from "./utils/path"
import { StartupTimer } from "./utils/startup-timer"

let loggerWired = false

/**
 * Wire Logger to host output channels. Safe to call multiple times (once-only).
 * VS Code activate calls this early so pre-initialize startup marks are visible.
 */
export function wireExtensionLogger(): void {
	if (loggerWired) {
		return
	}
	loggerWired = true
	Logger.subscribe((msg: string) => HostProvider.get().logToChannel(msg)) // File system logging
	Logger.subscribe((msg: string) => HostProvider.env.debugLog({ value: msg })) // Host debug logging
}

/**
 * Performs intialization for Cline that is common to all platforms.
 *
 * @param context
 * @returns The webview provider
 * @throws ClineConfigurationError if endpoints.json exists but is invalid
 */
export async function initialize(storageContext: StorageContext): Promise<WebviewProvider> {
	const timer = new StartupTimer("initialize")
	wireExtensionLogger()
	timer.mark("wireLogger")

	// Endpoints + StateManager are independent during init — run in parallel.
	const { ClineEndpoint } = await import("./config")
	const extensionFsPath = HostProvider.get().extensionFsPath
	const stateInit = StateManager.initialize(storageContext).catch((error) => {
		Logger.error("[Axline] CRITICAL: Failed to initialize StateManager:", error)
		HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: "Failed to initialize storage. Please check logs for details or try restarting the client.",
		})
	})
	await Promise.all([ClineEndpoint.initialize(extensionFsPath), stateInit])
	timer.mark("coreInit")

	// Register host-only SDK provider handlers (e.g. VS Code Language Model API),
	// which depend on the `vscode` module and cannot live in the SDK package.
	// Must run before any handler is built (standalone utilities or task loop).
	registerVsCodeLmHandler()
	timer.mark("vscodeLmHandler")

	// BannerService needs HostRegistryInfo; distinct ID init starts this in the background.
	await ensureHostRegistryInfoReady()

	// =============== External services ===============
	await ErrorService.initialize()
	// Initialize PostHog client provider (skip in self-hosted mode)
	if (!ClineEndpoint.isSelfHosted()) {
		PostHogClientProvider.getInstance()
	}
	timer.mark("externalServices")

	// =============== Webview services ===============
	const webview = HostProvider.get().createWebviewProvider()
	timer.mark("createWebview")

	const stateManager = StateManager.get()
	// Non-blocking announcement check and display
	showVersionUpdateAnnouncement(stateManager)
	// Check if this workspace was opened from worktree quick launch
	await checkWorktreeAutoOpen(stateManager)
	timer.mark("worktreeAutoOpen")

	// =============== Background sync and cleanup tasks ===============
	// Use remote config blobStoreConfig if available, otherwise fall back to env vars
	const blobStoreSettings = stateManager.getRemoteConfigSettings()?.blobStoreConfig ?? getBlobStoreSettingsFromEnv()
	syncWorker().init({ ...blobStoreSettings, userDistinctId: getDistinctId() })
	// Clean up old temp files in background (non-blocking) and start periodic cleanup every 24 hours
	ClineTempManager.startPeriodicCleanup()

	telemetryService.captureExtensionActivated()
	timer.finish()

	return webview
}

async function showVersionUpdateAnnouncement(stateManager: StateManager) {
	// Version checking for autoupdate notification
	const currentVersion = ExtensionRegistryInfo.version
	const previousVersion = stateManager.getGlobalStateKey("clineVersion")
	// Perform post-update actions if necessary
	try {
		if (!previousVersion || currentVersion !== previousVersion) {
			Logger.log(`Axline version changed: ${previousVersion} -> ${currentVersion}. First run or update detected.`)

			// Check if there's a new announcement to show
			const lastShownAnnouncementId = stateManager.getGlobalStateKey("lastShownAnnouncementId")
			const latestAnnouncementId = getLatestAnnouncementId()

			if (lastShownAnnouncementId !== latestAnnouncementId) {
				// Show notification when there's a new announcement (major/minor updates or fresh installs)
				const message = previousVersion
					? `Axline has been updated to v${currentVersion}`
					: `Welcome to Axline v${currentVersion}`
				HostProvider.window.showMessage({
					type: ShowMessageType.INFORMATION,
					message,
				})
			}
			// Always update the main version tracker for the next launch.
			stateManager.setGlobalState("clineVersion", currentVersion)
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		Logger.error(`Error during post-update actions: ${errorMessage}, Stack trace: ${error.stack}`)
	}
}

/**
 * Checks if this workspace was opened from the worktree quick launch button.
 * If so, opens the Cline sidebar and clears the state.
 */
async function checkWorktreeAutoOpen(stateManager: StateManager): Promise<void> {
	try {
		// Read directly from globalState (not StateManager cache) since this may have been
		// set by another window right before this one opened
		const worktreeAutoOpenPath = stateManager.getGlobalStateKey("worktreeAutoOpenPath")
		if (!worktreeAutoOpenPath) {
			return
		}

		// Get current workspace path
		const workspacePaths = (await HostProvider.workspace.getWorkspacePaths({})).paths
		if (workspacePaths.length === 0) {
			return
		}

		const currentPath = workspacePaths[0]

		// Check if current workspace matches the worktree path
		if (arePathsEqual(currentPath, worktreeAutoOpenPath)) {
			// Clear the state first to prevent re-triggering
			stateManager.setGlobalState("worktreeAutoOpenPath", undefined)
			// Open the Cline sidebar
			await HostProvider.workspace.openClineSidebarPanel({})
		}
	} catch (error) {
		Logger.error("Error checking worktree auto-open", error)
	}
}

/**
 * Performs cleanup when Cline is deactivated that is common to all platforms.
 */
export async function tearDown(): Promise<void> {
	try {
		AgentConfigLoader.getInstance()?.dispose()
		PostHogClientProvider.getInstance().dispose()
		telemetryService.dispose()
		ErrorService.get().dispose()
		featureFlagsService.dispose()
		// Dispose all webview instances
		await WebviewProvider.disposeAllInstances()
		syncWorker().dispose()
		clearOnboardingModelsCache()

		// Kill any running hook processes to prevent zombies
		await HookProcessRegistry.terminateAll()
		// Clean up hook discovery cache
		HookDiscoveryCache.getInstance().dispose()
		// Stop periodic temp file cleanup
		ClineTempManager.stopPeriodicCleanup()
	} finally {
		try {
			await StateManager.get().flushPendingState()
		} catch (error) {
			Logger.error("[Axline] Failed to flush pending state during teardown:", error)
		}
	}
}
