import { describe, it } from "mocha"
import "should"
import { hasCompletedLegacyVscodeCleanup, LEGACY_VSCODE_CLEANUP_DONE_KEY, markLegacyVscodeCleanupDone } from "../state-migrations"

function createMockContext() {
	const globalStateStore = new Map<string, unknown>()
	return {
		globalState: {
			get<T>(key: string): T | undefined {
				return globalStateStore.get(key) as T | undefined
			},
			async update(key: string, value: unknown): Promise<void> {
				if (value === undefined) {
					globalStateStore.delete(key)
				} else {
					globalStateStore.set(key, value)
				}
			},
		},
		_store: globalStateStore,
	}
}

describe("legacy VS Code cleanup guard", () => {
	it("returns false before cleanup sentinel is written", () => {
		const ctx = createMockContext()
		hasCompletedLegacyVscodeCleanup(ctx as never).should.be.false()
	})

	it("returns true after sentinel is written", async () => {
		const ctx = createMockContext()
		await markLegacyVscodeCleanupDone(ctx as never)
		hasCompletedLegacyVscodeCleanup(ctx as never).should.be.true()
		;(ctx._store.get(LEGACY_VSCODE_CLEANUP_DONE_KEY) as boolean).should.equal(true)
	})

	it("returns true for legacy lastShownAnnouncementId in VS Code memento", () => {
		const ctx = createMockContext()
		ctx._store.set("lastShownAnnouncementId", "announcement-1")
		hasCompletedLegacyVscodeCleanup(ctx as never).should.be.true()
	})
})
