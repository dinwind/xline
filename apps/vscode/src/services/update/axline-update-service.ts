import * as path from "node:path"
import * as vscode from "vscode"
import { HostProvider } from "@/hosts/host-provider"
import {
	installVsixFromPath,
	reloadVsCodeWindow,
	withUpdateNotificationProgress,
} from "@/hosts/vscode/axline-private-update-host"
import { ExtensionRegistryInfo } from "@/registry"
import { resolveAxlineUpdateDir } from "@/shared/axline-dir"
import { ShowMessageType } from "@/shared/proto/host/window"
import { Logger } from "@/shared/services/Logger"
import { AuthNexusUpdateClient } from "./authnexus-client"
import { getUpdateConfig } from "./config"
import { compareSemver } from "./semver"
import type { SoftwareReleaseInfo, UpdateCheckResult } from "./types"

const DEFAULT_CHECK_INTERVAL_HOURS = 24
const TOKEN_FILE = "authnexus-update.app-token.json"

export type UpdatePromptAction = "update" | "later"

export function isUpdateCheckSkipped(): boolean {
	return process.env.IS_DEV === "true" || process.env.AXLINE_NO_UPDATE_CHECK === "1"
}

export async function checkForAxlineUpdate(currentVersion = ExtensionRegistryInfo.version): Promise<UpdateCheckResult> {
	try {
		const config = getUpdateConfig()
		if (!config) {
			return { status: "disabled" }
		}

		const tokenPath = path.join(getTokenDir(), TOKEN_FILE)
		const client = new AuthNexusUpdateClient(config, tokenPath)
		const release = await client.fetchLatestRelease()
		if (compareSemver(currentVersion, release.version) >= 0) {
			return { status: "up_to_date", currentVersion }
		}
		return { status: "update_available", currentVersion, release }
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return { status: "error", message }
	}
}

export async function installAxlineUpdate(release: SoftwareReleaseInfo): Promise<void> {
	const config = getUpdateConfig()
	if (!config) {
		throw new Error("Private update is not configured")
	}

	const downloadDir = path.join(HostProvider.get().globalStorageFsPath, "updates")
	const vsixPath = path.join(downloadDir, `axline-${release.version}.vsix`)
	const client = new AuthNexusUpdateClient(config, path.join(getTokenDir(), TOKEN_FILE))
	await client.downloadRelease(release, vsixPath)
	await installVsixFromPath(vsixPath)
}

export async function promptForAxlineUpdate(
	release: SoftwareReleaseInfo,
	currentVersion: string,
): Promise<UpdatePromptAction | undefined> {
	const detail = release.releaseNotes?.trim()
	const message = release.mandatory
		? `Axline ${release.version} is required (current: ${currentVersion}).`
		: `Axline ${release.version} is available (current: ${currentVersion}).`

	const items = release.mandatory ? ["Update now"] : ["Update now", "Later"]
	const selected = await HostProvider.window.showMessage({
		type: ShowMessageType.WARNING,
		message,
		options: {
			modal: release.mandatory,
			detail,
			items,
		},
	})

	if (selected.selectedOption === "Update now") {
		try {
			await withUpdateNotificationProgress(`Installing Axline ${release.version}…`, async () =>
				installAxlineUpdate(release),
			)
			const reload = await HostProvider.window.showMessage({
				type: ShowMessageType.INFORMATION,
				message: `Axline ${release.version} installed. Reload the window to activate it.`,
				options: { items: ["Reload now", "Later"] },
			})
			if (reload.selectedOption === "Reload now") {
				await reloadVsCodeWindow()
			}
			return "update"
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error)
			await HostProvider.window.showMessage({
				type: ShowMessageType.ERROR,
				message: `Failed to install Axline update: ${msg}`,
			})
		}
	}
	return selected.selectedOption === "Later" ? "later" : undefined
}

export function startAxlineUpdateChecker(): vscode.Disposable | undefined {
	if (isUpdateCheckSkipped()) {
		Logger.log("[Axline][update] Auto-check skipped (IS_DEV or AXLINE_NO_UPDATE_CHECK)")
		return undefined
	}

	let configEnabled = false
	try {
		configEnabled = getUpdateConfig() !== null
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		Logger.error(`[Axline][update] Private update config invalid: ${message}`)
		return undefined
	}
	if (!configEnabled) {
		Logger.log("[Axline][update] Private update not configured (missing authNexusBaseUrl / updateAppId / enrollment)")
		return undefined
	}

	const settings = vscode.workspace.getConfiguration("axline.update")
	if (settings.get<boolean>("autoCheck", true) === false) {
		Logger.log("[Axline][update] Auto-check disabled via axline.update.autoCheck")
		return undefined
	}

	const runCheck = async (opts: { silent: boolean; notifyOnError?: boolean }) => {
		const result = await checkForAxlineUpdate()
		Logger.log(
			`[Axline][update] check status=${result.status}` +
				(result.status === "update_available"
					? ` remote=${result.release.version} current=${result.currentVersion}`
					: result.status === "up_to_date"
						? ` current=${result.currentVersion}`
						: result.status === "error"
							? ` error=${result.message}`
							: ""),
		)
		if (result.status === "update_available") {
			await promptForAxlineUpdate(result.release, result.currentVersion)
			return
		}
		if (!opts.silent && result.status === "up_to_date") {
			void HostProvider.window.showMessage({
				type: ShowMessageType.INFORMATION,
				message: `Axline is up to date (v${result.currentVersion}).`,
			})
		}
		if (!opts.silent && result.status === "error") {
			void HostProvider.window.showMessage({
				type: ShowMessageType.ERROR,
				message: `Failed to check for Axline updates: ${result.message}`,
			})
		}
		// Startup is silent for "up to date", but still surface hard failures once (HTTP/TLS cutover).
		if (opts.notifyOnError && result.status === "error") {
			void HostProvider.window.showMessage({
				type: ShowMessageType.WARNING,
				message: `Axline update check failed: ${result.message}`,
			})
		}
	}

	// Defer past activation so the update notification is not dropped during busy startup.
	const startupTimer = setTimeout(() => {
		void runCheck({ silent: true, notifyOnError: true })
	}, 2_500)

	const intervalHours = settings.get<number>("checkIntervalHours", DEFAULT_CHECK_INTERVAL_HOURS)
	const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1000
	const timer = setInterval(() => {
		void runCheck({ silent: true })
	}, intervalMs)
	return {
		dispose: () => {
			clearTimeout(startupTimer)
			clearInterval(timer)
		},
	}
}

export async function runManualAxlineUpdateCheck(): Promise<void> {
	if (isUpdateCheckSkipped()) {
		void HostProvider.window.showMessage({
			type: ShowMessageType.INFORMATION,
			message: "Axline update checks are disabled in development mode.",
		})
		return
	}
	if (!getUpdateConfig()) {
		void HostProvider.window.showMessage({
			type: ShowMessageType.WARNING,
			message:
				"Private update is not configured. Set authNexusBaseUrl and updateAppId in endpoints.json and updateEnrollmentCode in ~/.axline/secrets.json (or AXLINE_UPDATE_ENROLLMENT_CODE).",
		})
		return
	}

	const result = await withUpdateNotificationProgress("Checking for Axline updates…", async () => checkForAxlineUpdate())

	if (result.status === "disabled") {
		void HostProvider.window.showMessage({
			type: ShowMessageType.WARNING,
			message: "Private update is not configured.",
		})
		return
	}
	if (result.status === "up_to_date") {
		void HostProvider.window.showMessage({
			type: ShowMessageType.INFORMATION,
			message: `Axline is up to date (v${result.currentVersion}).`,
		})
		return
	}
	if (result.status === "error") {
		void HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: `Failed to check for Axline updates: ${result.message}`,
		})
		return
	}
	await promptForAxlineUpdate(result.release, result.currentVersion)
}

function getTokenDir(): string {
	return resolveAxlineUpdateDir()
}
