import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { FeedbackApiError } from "../errors"
import { RestFeedbackClient } from "../rest-client"

describe("RestFeedbackClient.list", () => {
	const originalFetch = globalThis.fetch

	beforeEach(() => {
		globalThis.fetch = originalFetch
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	it("treats HTTP 404 as an empty page (not a list error)", async () => {
		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ message: "Feedback not found", statusCode: 404 }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			})) as unknown as typeof fetch

		const client = new RestFeedbackClient({
			baseUrl: "https://hub.example.com",
			appId: "axline",
			getAccessToken: async () => "autotest_token",
			refreshAccessToken: async () => null,
		})

		const page = await client.list({ scope: "mine", page: 1, limit: 50 })
		expect(page.items).toEqual([])
		expect(page.total).toBe(0)
		expect(page.page).toBe(1)
		expect(page.limit).toBe(50)
	})

	it("still surfaces non-404 list failures", async () => {
		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ message: "权限不足", statusCode: 403 }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			})) as unknown as typeof fetch

		const client = new RestFeedbackClient({
			baseUrl: "https://hub.example.com",
			appId: "axline",
			getAccessToken: async () => "autotest_token",
			refreshAccessToken: async () => null,
		})

		let caught: unknown
		try {
			await client.list({ scope: "mine" })
		} catch (error) {
			caught = error
		}
		expect(caught).toBeInstanceOf(FeedbackApiError)
		expect((caught as FeedbackApiError).code).toBe("insufficient_permission")
	})

	it("keeps getByNumber 404 as not_found", async () => {
		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ message: "Feedback not found", statusCode: 404 }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			})) as unknown as typeof fetch

		const client = new RestFeedbackClient({
			baseUrl: "https://hub.example.com",
			appId: "axline",
			getAccessToken: async () => "autotest_token",
			refreshAccessToken: async () => null,
		})

		await expect(client.getByNumber(99)).rejects.toMatchObject({
			code: "not_found",
			status: 404,
		})
	})
})
