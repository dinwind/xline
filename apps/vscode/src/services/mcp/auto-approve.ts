import { MCP_AUTO_APPROVE_ALL_TOOLS } from "@cline/shared/storage"

/**
 * Whether a tool is covered by an MCP server's `autoApprove` list.
 * `"*"` means every tool on that server is approved.
 */
export function isMcpToolNameAutoApproved(autoApprove: string[] | undefined, toolName: string): boolean {
	if (!autoApprove?.length) {
		return false
	}
	return autoApprove.includes(MCP_AUTO_APPROVE_ALL_TOOLS) || autoApprove.includes(toolName)
}

/**
 * Apply a batch auto-approve toggle to the persisted `autoApprove` list.
 * Expands `"*"` when denying so individual tools can be excluded.
 */
export function applyMcpToolAutoApproveToggle(
	current: string[] | undefined,
	toolNames: string[],
	shouldAllow: boolean,
	knownToolNames: string[] = toolNames,
): string[] {
	const approve = [...(current ?? [])]

	if (shouldAllow) {
		if (approve.includes(MCP_AUTO_APPROVE_ALL_TOOLS)) {
			return approve
		}
		const known = knownToolNames.length > 0 ? knownToolNames : toolNames
		for (const toolName of toolNames) {
			if (!approve.includes(toolName)) {
				approve.push(toolName)
			}
		}
		const wouldApprove = new Set(approve)
		if (known.length > 0 && known.every((name) => wouldApprove.has(name))) {
			return [MCP_AUTO_APPROVE_ALL_TOOLS]
		}
		return approve
	}

	if (approve.includes(MCP_AUTO_APPROVE_ALL_TOOLS)) {
		const deny = new Set(toolNames)
		const known = knownToolNames.length > 0 ? knownToolNames : toolNames
		return known.filter((name) => !deny.has(name))
	}

	for (const toolName of toolNames) {
		const index = approve.indexOf(toolName)
		if (index !== -1) {
			approve.splice(index, 1)
		}
	}
	return approve
}
