import { describe, expect, it } from "bun:test"
import { isFeedbackAllowedMime, resolveFeedbackMime } from "@shared/feedback-attachments"
import {
	filterFeedbackClientContext,
	mergeRequiredFeedbackClientContext,
	serializeFeedbackClientContext,
} from "../client-context-pure"
import { mapHttpStatusToFeedbackError, userFacingFeedbackError } from "../errors"
import { feedbackStatusLabel, feedbackStatusTone } from "../status-labels"
import type { FeedbackClientContext } from "../types"
import {
	assertAuthenticatedAttachmentPath,
	buildFeedbackAttachmentUrl,
	buildFeedbackByNumberUrl,
	buildListFeedbackUrl,
	feedbackApiRoot,
} from "../urls"

describe("feedback URLs", () => {
	it("builds list URL with page/limit and scope", () => {
		const url = buildListFeedbackUrl("https://hub.example.com", "axline", {
			scope: "mine",
			page: 2,
			limit: 10,
			status: "OPEN",
		})
		expect(url).toBe("https://hub.example.com/api/apps/axline/feedback?scope=mine&page=2&limit=10&status=OPEN")
	})

	it("strips trailing slash on base and encodes app id", () => {
		expect(feedbackApiRoot("https://hub.example.com/", "ax line")).toBe("https://hub.example.com/api/apps/ax%20line/feedback")
	})

	it("builds by-number and attachment URLs", () => {
		expect(buildFeedbackByNumberUrl("https://h", "axline", 42)).toBe("https://h/api/apps/axline/feedback/by-number/42")
		expect(buildFeedbackAttachmentUrl("https://h", "axline", "fb1", "att1")).toBe(
			"https://h/api/apps/axline/feedback/fb1/attachments/att1",
		)
	})

	it("rejects public /uploads attachment paths", () => {
		expect(() => assertAuthenticatedAttachmentPath("/uploads/foo.png")).toThrow(/uploads/)
		expect(() => assertAuthenticatedAttachmentPath("/api/apps/axline/feedback/fb1/attachments/att1")).not.toThrow()
	})
})

describe("feedback error mapping", () => {
	it("maps 401/403/404/413/415/429", () => {
		expect(mapHttpStatusToFeedbackError(401).code).toBe("unauthorized")
		expect(mapHttpStatusToFeedbackError(403, { code: "app_mismatch" }).code).toBe("app_mismatch")
		expect(mapHttpStatusToFeedbackError(403, { code: "not_member" }).code).toBe("not_member")
		expect(mapHttpStatusToFeedbackError(404).code).toBe("not_found")
		expect(mapHttpStatusToFeedbackError(413).code).toBe("payload_too_large")
		expect(mapHttpStatusToFeedbackError(415).code).toBe("unsupported_media_type")
		expect(mapHttpStatusToFeedbackError(429).retryable).toBe(true)
	})

	it("preserves Hub 404 body message instead of forcing Feedback not found", () => {
		const err = mapHttpStatusToFeedbackError(404, { message: "App not found" })
		expect(err.code).toBe("not_found")
		expect(err.message).toBe("App not found")
		expect(userFacingFeedbackError(err)).toBe("App not found")
	})

	it("defaults 404 without body to Feedback not found", () => {
		const err = mapHttpStatusToFeedbackError(404)
		expect(err.message).toBe("Feedback not found.")
		expect(userFacingFeedbackError(err)).toBe("Feedback not found.")
	})

	it("does not treat 403 as session-expired copy", () => {
		const msg = userFacingFeedbackError(mapHttpStatusToFeedbackError(403, { code: "not_member" }))
		expect(msg.toLowerCase()).not.toContain("sign in again")
		expect(msg.toLowerCase()).toContain("member")
	})
})

describe("feedback status labels", () => {
	it("maps hub statuses per client plan §7", () => {
		expect(feedbackStatusLabel("NEEDS_INFO")).toBe("Needs your reply")
		expect(feedbackStatusLabel("IMPLEMENTING")).toBe("In progress")
		expect(feedbackStatusTone("DONE")).toBe("success")
		expect(feedbackStatusTone("NEEDS_INFO")).toBe("warning")
	})
})

describe("client context serialization", () => {
	const full: FeedbackClientContext = {
		axlineVersion: "0.3.0",
		vscodeVersion: "1.96.0",
		platform: "win32",
		arch: "x64",
		appName: "Cursor",
		language: "zh-cn",
		uiKind: "Desktop",
		extensionMode: "production",
	}

	it("filters to selected allowlisted keys only", () => {
		const filtered = filterFeedbackClientContext(full, ["axlineVersion", "platform"])
		expect(filtered).toEqual({ axlineVersion: "0.3.0", platform: "win32" })
		expect(serializeFeedbackClientContext(filtered)).toBe(JSON.stringify({ axlineVersion: "0.3.0", platform: "win32" }))
	})

	it("always merges required keys even when client selects none", () => {
		const merged = mergeRequiredFeedbackClientContext(full, [])
		expect(merged.axlineVersion).toBe("0.3.0")
		expect(merged.vscodeVersion).toBe("1.96.0")
		expect(merged.platform).toBe("win32")
		expect(Object.keys(merged).length).toBe(8)
	})
})

describe("feedback attachment mime", () => {
	it("allows images, logs, and documents", () => {
		expect(isFeedbackAllowedMime("image/png")).toBe(true)
		expect(isFeedbackAllowedMime("application/pdf")).toBe(true)
		expect(isFeedbackAllowedMime("text/markdown")).toBe(true)
		expect(isFeedbackAllowedMime("application/json")).toBe(true)
		expect(isFeedbackAllowedMime("text/csv")).toBe(true)
		expect(isFeedbackAllowedMime("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true)
		expect(isFeedbackAllowedMime("application/zip")).toBe(false)
	})

	it("resolves mime from extension when browser type is empty", () => {
		expect(resolveFeedbackMime("notes.md", "")).toBe("text/markdown")
		expect(resolveFeedbackMime("axline.log", "")).toBe("text/plain")
		expect(resolveFeedbackMime("trace.jsonl", "")).toBe("application/x-ndjson")
		expect(resolveFeedbackMime("spec.docx", "")).toBe(
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		)
	})
})
