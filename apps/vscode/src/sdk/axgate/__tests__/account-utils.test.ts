import { describe, expect, it } from "vitest"
import {
	filterEnabledProviders,
	filterQuotaUsageForSubject,
	hasQuotaUsageEntries,
	mapProviderSummary,
	toIdeProjectId,
} from "../account-utils"

describe("toIdeProjectId", () => {
	it("prefixes subject with ide-", () => {
		expect(toIdeProjectId("6295ae0c-1088-482c-84ec-a26a7c755846")).toBe("ide-6295ae0c-1088-482c-84ec-a26a7c755846")
		expect(toIdeProjectId("dengzhi@mtsilicon.com")).toBe("ide-dengzhi@mtsilicon.com")
	})
})

describe("filterQuotaUsageForSubject", () => {
	it("returns only the current user's project usage", () => {
		const usage = {
			"ide-6295ae0c-1088-482c-84ec-a26a7c755846": 1,
			"ide-dengzhi@mtsilicon.com": 1,
		}

		expect(filterQuotaUsageForSubject(usage, "6295ae0c-1088-482c-84ec-a26a7c755846")).toEqual({
			"ide-6295ae0c-1088-482c-84ec-a26a7c755846": 1,
		})
	})

	it("returns empty object when the user has no usage yet", () => {
		const usage = {
			"ide-dengzhi@mtsilicon.com": 1,
		}

		expect(filterQuotaUsageForSubject(usage, "6295ae0c-1088-482c-84ec-a26a7c755846")).toEqual({})
	})

	it("returns undefined when usage or subject is missing", () => {
		expect(filterQuotaUsageForSubject(undefined, "user-1")).toBeUndefined()
		expect(filterQuotaUsageForSubject({ "ide-user-1": 1 }, "")).toBeUndefined()
	})
})

describe("hasQuotaUsageEntries", () => {
	it("detects non-empty usage maps", () => {
		expect(hasQuotaUsageEntries({ "ide-user-1": 1 })).toBe(true)
		expect(hasQuotaUsageEntries({})).toBe(false)
		expect(hasQuotaUsageEntries(undefined)).toBe(false)
	})
})

describe("mapProviderSummary", () => {
	it("treats enabled as true only when explicitly set", () => {
		expect(mapProviderSummary({ name: "deepseek", enabled: true }).enabled).toBe(true)
		expect(mapProviderSummary({ name: "deepseek", enabled: false }).enabled).toBe(false)
		expect(mapProviderSummary({ name: "deepseek" }).enabled).toBe(false)
	})
})

describe("filterEnabledProviders", () => {
	it("keeps only enabled providers", () => {
		const providers = [
			{ name: "deepseek", enabled: true },
			{ name: "aliyun", enabled: false },
			{ name: "local-gemma", enabled: true },
		]

		expect(filterEnabledProviders(providers)).toEqual([
			{ name: "deepseek", enabled: true },
			{ name: "local-gemma", enabled: true },
		])
	})
})
