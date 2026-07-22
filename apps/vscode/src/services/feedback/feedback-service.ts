import { stripAxgateTokenPrefix } from "@cline/core"
import * as vscode from "vscode"
import { AuthService } from "@/sdk/auth-service"
import { collectFeedbackClientContext, filterFeedbackClientContext } from "./client-context"
import { assertFeedbackBaseUrlSecure, getFeedbackConfig } from "./config"
import { FeedbackApiError, userFacingFeedbackError } from "./errors"
import { MockFeedbackClient } from "./mock-client"
import { RestFeedbackClient } from "./rest-client"
import type {
	CreateFeedbackInput,
	FeedbackAttachmentBytes,
	FeedbackClient,
	FeedbackClientContext,
	FeedbackItem,
	FeedbackPage,
	ListFeedbackQuery,
} from "./types"

/**
 * Host-side Feedback facade: JWT stays here; webview never sees Authorization headers.
 */
export class FeedbackService {
	private static instance: FeedbackService | undefined
	private client: FeedbackClient | null = null
	private refreshPromise: Promise<string | null> | null = null

	static getInstance(): FeedbackService {
		if (!FeedbackService.instance) {
			FeedbackService.instance = new FeedbackService()
		}
		return FeedbackService.instance
	}

	/** Test helper */
	static resetInstance(): void {
		FeedbackService.instance = undefined
	}

	isAuthenticated(): boolean {
		return AuthService.getInstance().getInfo().user !== undefined
	}

	getClientContext(extensionMode?: vscode.ExtensionMode): FeedbackClientContext {
		return collectFeedbackClientContext(extensionMode)
	}

	filterClientContext(full: FeedbackClientContext, selectedKeys: readonly string[]): FeedbackClientContext {
		return filterFeedbackClientContext(full, selectedKeys)
	}

	async list(query: ListFeedbackQuery): Promise<FeedbackPage> {
		return this.withClient((client) => client.list(query))
	}

	async getByNumber(number: number): Promise<FeedbackItem> {
		return this.withClient((client) => client.getByNumber(number))
	}

	async create(input: CreateFeedbackInput): Promise<FeedbackItem> {
		return this.withClient((client) => client.create(input))
	}

	async addComment(number: number, body: string): Promise<FeedbackItem> {
		return this.withClient((client) => client.addComment(number, body))
	}

	async downloadAttachment(feedbackId: string, attachmentId: string): Promise<FeedbackAttachmentBytes> {
		return this.withClient((client) => client.downloadAttachment(feedbackId, attachmentId))
	}

	formatError(error: unknown): string {
		return userFacingFeedbackError(error)
	}

	private async withClient<T>(fn: (client: FeedbackClient) => Promise<T>): Promise<T> {
		const client = this.getOrCreateClient()
		try {
			return await fn(client)
		} catch (error) {
			if (error instanceof FeedbackApiError && error.code === "unauthorized") {
				await AuthService.getInstance().handleDeauth()
			}
			throw error
		}
	}

	private getOrCreateClient(): FeedbackClient {
		if (this.client) {
			return this.client
		}
		const config = getFeedbackConfig()
		if (!config) {
			throw new FeedbackApiError({
				code: "hub_unavailable",
				message: "Feedback Hub is not configured (missing authNexusBaseUrl)",
				status: 0,
			})
		}
		if (config.useMock) {
			this.client = new MockFeedbackClient()
			return this.client
		}

		assertFeedbackBaseUrlSecure(config.authNexusBaseUrl)
		this.client = new RestFeedbackClient({
			baseUrl: config.authNexusBaseUrl,
			appId: config.appId,
			getAccessToken: () => this.getBearerToken(),
			refreshAccessToken: () => this.refreshBearerTokenOnce(),
		})
		return this.client
	}

	private async getBearerToken(): Promise<string | null> {
		const token = await AuthService.getInstance().getAuthToken()
		if (!token) {
			return null
		}
		return stripAxgateTokenPrefix(token)
	}

	/** Single-flight refresh then return new bearer; 403 must not call this path for deauth. */
	private async refreshBearerTokenOnce(): Promise<string | null> {
		if (this.refreshPromise) {
			return this.refreshPromise
		}
		this.refreshPromise = (async () => {
			try {
				// getAuthToken already refreshes when near expiry; force via axgate by clearing cache path:
				// call getAuthToken again after a no-op wait — AuthService uses ensureValid internally.
				const token = await AuthService.getInstance().getAuthToken()
				return token ? stripAxgateTokenPrefix(token) : null
			} finally {
				this.refreshPromise = null
			}
		})()
		return this.refreshPromise
	}
}
