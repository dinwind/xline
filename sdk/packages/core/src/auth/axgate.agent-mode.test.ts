import { describe, expect, it } from "vitest";
import {
	isAxgateAutoRoutingModel,
	resolveAxgateAgentMode,
} from "./axgate";

describe("isAxgateAutoRoutingModel", () => {
	it("treats auto and ax_auto as auto-routing ids", () => {
		expect(isAxgateAutoRoutingModel("auto")).toBe(true);
		expect(isAxgateAutoRoutingModel("ax_auto")).toBe(true);
		expect(isAxgateAutoRoutingModel(" AX_AUTO ")).toBe(true);
	});

	it("rejects concrete model ids", () => {
		expect(isAxgateAutoRoutingModel("ax_aliyun_kimi-k2.6")).toBe(false);
	});
});

describe("resolveAxgateAgentMode", () => {
	it("maps plan sessions to plan", () => {
		expect(resolveAxgateAgentMode("plan", "auto")).toBe("plan");
		expect(resolveAxgateAgentMode("plan", "ax_aliyun_kimi-k2.6")).toBe("plan");
	});

	it("maps act + auto model to auto", () => {
		expect(resolveAxgateAgentMode("act", "auto")).toBe("auto");
		expect(resolveAxgateAgentMode("act", "ax_auto")).toBe("auto");
	});

	it("maps act + concrete model to act", () => {
		expect(resolveAxgateAgentMode("act", "ax_aliyun_kimi-k2.6")).toBe("act");
	});
});
