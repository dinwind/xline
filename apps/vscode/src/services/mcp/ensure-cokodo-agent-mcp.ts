import {
	COKODO_MCP_SERVER_NAME,
	type CokodoMcpServerConfig,
	hasCokodoAgentProtocol,
	MCP_AUTO_APPROVE_ALL_TOOLS,
	resolveCokodoMcpServerEntryForWorkspace,
} from "@cline/shared/storage"
import { updateMcpSettingsFile } from "@/services/mcp/settingsLock"
import { Logger } from "@/shared/services/Logger"

export type EnsureCokodoMcpResult = "added" | "updated" | "unchanged" | "skipped"

function entriesEqual(left: CokodoMcpServerConfig, right: CokodoMcpServerConfig): boolean {
	return JSON.stringify(left) === JSON.stringify(right)
}

/**
 * Merge desired cokodo MCP launch config with any existing user autoApprove list.
 * Empty autoApprove is upgraded to `["*"]` so cokodo tools stay default-approved.
 */
export function mergeCokodoMcpServerEntry(
	existing: CokodoMcpServerConfig | undefined,
	desired: CokodoMcpServerConfig,
): CokodoMcpServerConfig {
	if (!existing) {
		return desired
	}

	const existingAutoApprove = Array.isArray(existing.autoApprove) ? existing.autoApprove : undefined
	const desiredAutoApprove = Array.isArray(desired.autoApprove) ? desired.autoApprove : [MCP_AUTO_APPROVE_ALL_TOOLS]
	const autoApprove =
		existingAutoApprove === undefined || existingAutoApprove.length === 0 ? desiredAutoApprove : existingAutoApprove

	return {
		...desired,
		autoApprove,
	}
}

export async function ensureCokodoAgentMcpServer(
	workspacePath: string | undefined,
	getSettingsPath: () => Promise<string>,
): Promise<EnsureCokodoMcpResult> {
	if (!workspacePath || !hasCokodoAgentProtocol(workspacePath)) {
		return "skipped"
	}

	const serverEntry = resolveCokodoMcpServerEntryForWorkspace(workspacePath)
	if (!serverEntry) {
		return "skipped"
	}

	const settingsPath = await getSettingsPath()
	const action = await updateMcpSettingsFile<EnsureCokodoMcpResult>(settingsPath, (settings) => {
		const servers = settings.mcpServers as Record<string, CokodoMcpServerConfig> | undefined
		if (!servers || typeof servers !== "object") {
			settings.mcpServers = { [COKODO_MCP_SERVER_NAME]: serverEntry }
			return "added"
		}

		const existing = servers[COKODO_MCP_SERVER_NAME]
		if (existing === undefined) {
			servers[COKODO_MCP_SERVER_NAME] = serverEntry
			settings.mcpServers = servers
			return "added"
		}

		const merged = mergeCokodoMcpServerEntry(existing, serverEntry)
		if (entriesEqual(existing, merged)) {
			return "unchanged"
		}

		servers[COKODO_MCP_SERVER_NAME] = merged
		settings.mcpServers = servers
		return "updated"
	})

	if (action === "added") {
		Logger.log(`[Cokodo] Added ${COKODO_MCP_SERVER_NAME} MCP server to settings`)
	} else if (action === "updated") {
		Logger.log(`[Cokodo] Updated ${COKODO_MCP_SERVER_NAME} MCP server in settings`)
	}

	return action
}
