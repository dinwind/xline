import { describe, expect, it } from "bun:test"
import { compareSemver } from "../semver"

describe("compareSemver", () => {
	it("orders dotted versions numerically", () => {
		expect(compareSemver("1.2.3", "1.2.2")).toBe(1)
		expect(compareSemver("1.2.2", "1.2.3")).toBe(-1)
		expect(compareSemver("1.2.3", "1.2.3")).toBe(0)
	})

	it("ignores prerelease suffix for comparison", () => {
		expect(compareSemver("1.2.3-beta.1", "1.2.3")).toBe(0)
	})

	it("compares versions with different segment counts", () => {
		expect(compareSemver("1.2", "1.2.0")).toBe(0)
		expect(compareSemver("1.2.1", "1.2")).toBe(1)
	})
})
