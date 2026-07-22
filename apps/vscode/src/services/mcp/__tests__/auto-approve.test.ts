import { MCP_AUTO_APPROVE_ALL_TOOLS } from "@cline/shared/storage"
import { describe, expect, it } from "vitest"
import { applyMcpToolAutoApproveToggle, isMcpToolNameAutoApproved } from "../auto-approve"

describe("isMcpToolNameAutoApproved", () => {
	it("returns false for empty lists", () => {
		expect(isMcpToolNameAutoApproved(undefined, "session_gate")).toBe(false)
		expect(isMcpToolNameAutoApproved([], "session_gate")).toBe(false)
	})

	it("matches explicit tool names and the all-tools sentinel", () => {
		expect(isMcpToolNameAutoApproved(["session_gate"], "session_gate")).toBe(true)
		expect(isMcpToolNameAutoApproved(["session_gate"], "get_project_context")).toBe(false)
		expect(isMcpToolNameAutoApproved([MCP_AUTO_APPROVE_ALL_TOOLS], "get_project_context")).toBe(true)
	})
})

describe("applyMcpToolAutoApproveToggle", () => {
	const known = ["session_gate", "get_project_context", "update_status"]

	it("collapses a full allow list to the all-tools sentinel", () => {
		expect(applyMcpToolAutoApproveToggle([], known, true, known)).toEqual([MCP_AUTO_APPROVE_ALL_TOOLS])
	})

	it("expands the sentinel when denying a subset", () => {
		expect(applyMcpToolAutoApproveToggle([MCP_AUTO_APPROVE_ALL_TOOLS], ["session_gate"], false, known)).toEqual([
			"get_project_context",
			"update_status",
		])
	})

	it("clears the list when denying every known tool", () => {
		expect(applyMcpToolAutoApproveToggle([MCP_AUTO_APPROVE_ALL_TOOLS], known, false, known)).toEqual([])
	})
})
