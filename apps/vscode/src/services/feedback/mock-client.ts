import { FeedbackApiError } from "./errors"
import type {
	CreateFeedbackInput,
	FeedbackAttachmentBytes,
	FeedbackClient,
	FeedbackComment,
	FeedbackItem,
	FeedbackPage,
	ListFeedbackQuery,
} from "./types"

/**
 * In-memory FeedbackClient for UI/dev when `AXLINE_FEEDBACK_MOCK=1`.
 * Must never be the default for real users (no fake success on production path).
 */
export class MockFeedbackClient implements FeedbackClient {
	private nextNumber = 1
	private readonly items = new Map<number, FeedbackItem>()
	private readonly attachmentBytes = new Map<string, FeedbackAttachmentBytes>()

	constructor() {
		const seeded = this.makeItem({
			type: "BUG",
			title: "Mock: sidebar flickers on theme change",
			body: "Repro: switch light/dark quickly. Seeded for UI dogfood without Hub.",
			visibility: "PUBLIC",
			clientContext: { axlineVersion: "0.3.0", platform: "win32" },
		})
		seeded.status = "NEEDS_INFO"
		this.items.set(seeded.number, seeded)

		const privateItem = this.makeItem({
			type: "FEATURE",
			title: "Mock: remember last feedback tab",
			body: "Private seeded item for Mine list.",
			visibility: "PRIVATE",
		})
		this.items.set(privateItem.number, privateItem)
	}

	async list(query: ListFeedbackQuery): Promise<FeedbackPage> {
		const all = [...this.items.values()].sort((a, b) => b.number - a.number)
		const filtered = query.scope === "public" ? all.filter((i) => i.visibility === "PUBLIC") : all
		const page = Math.max(1, query.page ?? 1)
		const limit = Math.max(1, query.limit ?? 20)
		const start = (page - 1) * limit
		const items = filtered.slice(start, start + limit)
		return { items, total: filtered.length, page, limit }
	}

	async getByNumber(number: number): Promise<FeedbackItem> {
		const item = this.items.get(number)
		if (!item) {
			throw new FeedbackApiError({ code: "not_found", message: "Feedback not found", status: 404 })
		}
		return structuredClone(item)
	}

	async create(input: CreateFeedbackInput): Promise<FeedbackItem> {
		const item = this.makeItem(input)
		this.items.set(item.number, item)
		return structuredClone(item)
	}

	async addComment(number: number, body: string): Promise<FeedbackItem> {
		const item = this.items.get(number)
		if (!item) {
			throw new FeedbackApiError({ code: "not_found", message: "Feedback not found", status: 404 })
		}
		const comment: FeedbackComment = {
			id: `cmt_${Date.now()}`,
			authorType: "USER",
			authorId: "mock-user",
			author: { id: "mock-user", username: "mock" },
			body,
			createdAt: new Date().toISOString(),
		}
		item.comments = [...(item.comments ?? []), comment]
		item.updatedAt = comment.createdAt
		if (item.status === "NEEDS_INFO") {
			item.status = "TRIAGING"
		}
		return structuredClone(item)
	}

	async downloadAttachment(feedbackId: string, attachmentId: string): Promise<FeedbackAttachmentBytes> {
		const key = `${feedbackId}:${attachmentId}`
		const bytes = this.attachmentBytes.get(key)
		if (!bytes) {
			throw new FeedbackApiError({ code: "not_found", message: "Feedback not found", status: 404 })
		}
		return bytes
	}

	private makeItem(input: CreateFeedbackInput): FeedbackItem {
		const number = this.nextNumber++
		const id = `fb_mock_${number}`
		const now = new Date().toISOString()
		const attachments = (input.files ?? []).map((file, index) => {
			const attachmentId = `att_mock_${number}_${index}`
			this.attachmentBytes.set(`${id}:${attachmentId}`, {
				mimeType: file.mimeType,
				displayName: file.fileName,
				data: file.data,
			})
			return {
				id: attachmentId,
				mimeType: file.mimeType,
				sizeBytes: file.data.byteLength,
				displayName: file.fileName,
				downloadPath: `/api/apps/axline/feedback/${id}/attachments/${attachmentId}`,
			}
		})

		return {
			id,
			number,
			type: input.type,
			title: input.title,
			body: input.body,
			status: "OPEN",
			visibility: input.visibility ?? "PRIVATE",
			authorId: "mock-user",
			author: { id: "mock-user", username: "mock" },
			clientContext: input.clientContext,
			createdAt: now,
			updatedAt: now,
			comments: [],
			attachments,
			allowedTransitions: [],
			canDispatch: false,
		}
	}
}
