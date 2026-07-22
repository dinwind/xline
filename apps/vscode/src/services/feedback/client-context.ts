import * as vscode from "vscode"
import { ExtensionRegistryInfo } from "@/registry"
import { FEEDBACK_CONTEXT_KEYS, filterFeedbackClientContext } from "./client-context-pure"
import type { FeedbackClientContext } from "./types"

export type { FeedbackContextKey } from "./client-context-pure"
export {
	FEEDBACK_CONTEXT_KEYS,
	FEEDBACK_REQUIRED_CONTEXT_KEYS,
	filterFeedbackClientContext,
	mergeRequiredFeedbackClientContext,
	serializeFeedbackClientContext,
} from "./client-context-pure"

/**
 * Collect the default 8 non-sensitive fields. Never includes workspace paths,
 * file contents, terminal output, JWT/API keys, .env, or extra PII.
 */
export function collectFeedbackClientContext(extensionMode?: vscode.ExtensionMode): FeedbackClientContext {
	const mode =
		extensionMode === vscode.ExtensionMode.Development
			? "development"
			: extensionMode === vscode.ExtensionMode.Test
				? "test"
				: "production"

	return {
		axlineVersion: ExtensionRegistryInfo.version,
		vscodeVersion: vscode.version,
		uiKind: vscode.env.uiKind === vscode.UIKind.Web ? "Web" : "Desktop",
		platform: process.platform,
		arch: process.arch,
		appName: vscode.env.appName,
		language: vscode.env.language,
		extensionMode: mode,
	}
}

export function selectedContextFromChecklist(
	full: FeedbackClientContext,
	selectedKeys: readonly string[],
): FeedbackClientContext {
	return filterFeedbackClientContext(full, selectedKeys.length ? selectedKeys : [...FEEDBACK_CONTEXT_KEYS])
}
