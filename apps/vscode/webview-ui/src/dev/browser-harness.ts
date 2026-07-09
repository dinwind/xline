import { installMockExtensionHost } from "./mock-extension-host"

declare function acquireVsCodeApi(): unknown

/** True when Vite dev server is opened directly in a browser tab (no VS Code webview). */
export function isStandaloneBrowserDev(): boolean {
	return import.meta.env.DEV && typeof acquireVsCodeApi !== "function"
}

export function setupBrowserDevHarness(): void {
	if (!isStandaloneBrowserDev()) {
		return
	}
	installMockExtensionHost()
}
