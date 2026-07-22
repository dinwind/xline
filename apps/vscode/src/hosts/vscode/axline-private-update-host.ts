import * as vscode from "vscode"

export async function installVsixFromPath(vsixPath: string): Promise<void> {
	await vscode.commands.executeCommand("workbench.extensions.installExtension", vscode.Uri.file(vsixPath))
}

export async function reloadVsCodeWindow(): Promise<void> {
	await vscode.commands.executeCommand("workbench.action.reloadWindow")
}

export async function withUpdateNotificationProgress<T>(title: string, task: () => Promise<T>): Promise<T> {
	return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title }, task)
}
