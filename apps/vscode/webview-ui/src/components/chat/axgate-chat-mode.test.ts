import { describe, expect, it } from "vitest"
import { deriveAxgateChatMode, resolveAgentModelId } from "./axgate-chat-mode"

describe("axgate-chat-mode", () => {
	it("derives plan mode", () => {
		expect(deriveAxgateChatMode("plan", "axgate", "auto")).toBe("plan")
	})

	it("derives auto when act uses axgate auto model", () => {
		expect(deriveAxgateChatMode("act", "axgate", "auto")).toBe("auto")
	})

	it("derives agent for act with concrete model", () => {
		expect(deriveAxgateChatMode("act", "axgate", "gpt-4o")).toBe("agent")
	})

	it("picks first non-auto model for agent fallback", () => {
		expect(resolveAgentModelId("auto", ["auto", "gpt-4o", "claude-sonnet-4"])).toBe("gpt-4o")
	})
})
