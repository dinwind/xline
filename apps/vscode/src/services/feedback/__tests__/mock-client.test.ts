import { describe, expect, it } from "bun:test"
import { MockFeedbackClient } from "../mock-client"

describe("MockFeedbackClient", () => {
	it("lists mine and public scopes", async () => {
		const client = new MockFeedbackClient()
		const mine = await client.list({ scope: "mine" })
		const pub = await client.list({ scope: "public" })
		expect(mine.total).toBeGreaterThanOrEqual(2)
		expect(pub.items.every((i) => i.visibility === "PUBLIC")).toBe(true)
	})

	it("creates with attachment using authenticated downloadPath", async () => {
		const client = new MockFeedbackClient()
		const created = await client.create({
			type: "BUG",
			title: "autotest_mock_create",
			body: "body",
			files: [
				{
					fileName: "shot.png",
					mimeType: "image/png",
					data: new Uint8Array([1, 2, 3]),
				},
			],
		})
		expect(created.number).toBeGreaterThan(0)
		expect(created.attachments?.[0]?.downloadPath).toContain("/feedback/")
		expect(created.attachments?.[0]?.downloadPath).toContain("/attachments/")
		expect(created.attachments?.[0]?.downloadPath.includes("/uploads")).toBe(false)

		const bytes = await client.downloadAttachment(created.id, created.attachments![0].id)
		expect(bytes.data.length).toBe(3)
	})

	it("adds comment and moves NEEDS_INFO toward triage", async () => {
		const client = new MockFeedbackClient()
		const list = await client.list({ scope: "public" })
		const needsInfo = list.items.find((i) => i.status === "NEEDS_INFO")
		expect(needsInfo).toBeTruthy()
		const updated = await client.addComment(needsInfo!.number, "more info")
		expect(updated.comments?.length).toBeGreaterThan(0)
		expect(updated.status).toBe("TRIAGING")
	})
})
