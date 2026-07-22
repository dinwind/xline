import { describe, expect, it } from "vitest"
import { resolveAxgateBootstrapModels, resolveModeModelId } from "../mode-defaults"

describe("resolveModeModelId", () => {
	const allowed = ["ax_auto", "ax_aliyun_kimi-k2.6", "ax_aliyun_kimi-k2.7-code"]

	it("prefers mode_defaults entry when permitted", () => {
		expect(resolveModeModelId({ plan: "ax_aliyun_kimi-k2.6", auto: "ax_auto" }, "plan", allowed, "ax_auto")).toBe(
			"ax_aliyun_kimi-k2.6",
		)
	})

	it("falls back when mode default is not visible", () => {
		expect(resolveModeModelId({ plan: "ax_aliyun_unknown" }, "plan", allowed, "ax_auto")).toBe("ax_auto")
	})
})

describe("resolveAxgateBootstrapModels", () => {
	it("seeds act and plan model ids from mode_defaults", () => {
		const allowed = ["ax_auto", "ax_aliyun_kimi-k2.6", "ax_aliyun_kimi-k2.7-code"]
		const result = resolveAxgateBootstrapModels(
			{
				auto: "ax_auto",
				plan: "ax_aliyun_kimi-k2.6",
				act: "ax_aliyun_kimi-k2.7-code",
			},
			allowed,
			undefined,
		)

		expect(result.actModelId).toBe("ax_auto")
		expect(result.planModelId).toBe("ax_aliyun_kimi-k2.6")
	})
})
