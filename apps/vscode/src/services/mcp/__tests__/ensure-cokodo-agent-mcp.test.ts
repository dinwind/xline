import { type CokodoMcpServerConfig, MCP_AUTO_APPROVE_ALL_TOOLS } from "@cline/shared/storage"
import { describe, expect, it } from "vitest"
import { mergeCokodoMcpServerEntry } from "../ensure-cokodo-agent-mcp"

describe("mergeCokodoMcpServerEntry", () => {
	const desired: CokodoMcpServerConfig = {
		command: "co",
		args: ["serve", "--shared-launcher"],
		disabled: false,
		autoApprove: [MCP_AUTO_APPROVE_ALL_TOOLS],
	}

	it("returns desired entry when server does not exist yet", () => {
		expect(mergeCokodoMcpServerEntry(undefined, desired)).toEqual(desired)
	})

	it("upgrades empty autoApprove to the desired all-tools default", () => {
		expect(
			mergeCokodoMcpServerEntry(
				{
					command: "co",
					args: ["serve", "--shared-launcher"],
					disabled: false,
					autoApprove: [],
				},
				desired,
			),
		).toEqual(desired)
	})

	it("preserves a customized non-empty autoApprove list", () => {
		expect(
			mergeCokodoMcpServerEntry(
				{
					command: "co",
					args: ["serve", "--shared-launcher"],
					disabled: false,
					autoApprove: ["session_gate"],
				},
				desired,
			),
		).toEqual({
			...desired,
			autoApprove: ["session_gate"],
		})
	})
})
