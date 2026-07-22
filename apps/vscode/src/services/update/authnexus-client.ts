import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import type { AuthNexusAppToken, AxlineUpdateConfig, SoftwareReleaseInfo } from "./types"

const HTTP_TIMEOUT_MS = 30_000
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

type EnrollResponse = {
	access_token?: string
	accessToken?: string
	expires_in?: number
	expiresIn?: number
}

export class AuthNexusUpdateClient {
	constructor(
		private readonly config: AxlineUpdateConfig,
		private readonly tokenPath: string,
	) {}

	async getValidToken(): Promise<string> {
		const cached = await this.readCachedToken()
		if (cached && cached.expiresAtMs > Date.now() + TOKEN_REFRESH_BUFFER_MS) {
			return cached.accessToken
		}
		const enrolled = await this.enroll()
		await this.writeCachedToken(enrolled)
		return enrolled.accessToken
	}

	async fetchLatestRelease(): Promise<SoftwareReleaseInfo> {
		const token = await this.getValidToken()
		const url = `${this.config.authNexusBaseUrl}/api/software/${encodeURIComponent(this.config.updateAppId)}/latest`
		const response = await fetch(url, {
			headers: { Authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
		})

		if (response.status === 401) {
			await this.clearCachedToken()
			const retryToken = await this.getValidToken()
			const retry = await fetch(url, {
				headers: { Authorization: `Bearer ${retryToken}` },
				signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
			})
			if (!retry.ok) {
				throw new Error(await parseErrorMessage(retry))
			}
			return parseRelease(await retry.json())
		}

		if (!response.ok) {
			throw new Error(await parseErrorMessage(response))
		}

		return parseRelease(await response.json())
	}

	async downloadRelease(release: SoftwareReleaseInfo, destinationPath: string): Promise<void> {
		const response = await fetch(release.downloadUrl, {
			signal: AbortSignal.timeout(HTTP_TIMEOUT_MS * 4),
		})
		if (!response.ok) {
			throw new Error(`Failed to download update (${response.status} ${response.statusText})`)
		}

		await fs.mkdir(path.dirname(destinationPath), { recursive: true })
		const buffer = Buffer.from(await response.arrayBuffer())
		await fs.writeFile(destinationPath, buffer)
		assertValidVsixLayout(buffer)

		if (release.fileHash) {
			const actual = await sha256File(destinationPath)
			const expected = release.fileHash.trim().toLowerCase()
			if (actual !== expected) {
				await fs.rm(destinationPath, { force: true })
				throw new Error("Downloaded update failed SHA-256 integrity check")
			}
		}
	}

	private async enroll(): Promise<AuthNexusAppToken> {
		const url = `${this.config.authNexusBaseUrl}/api/auth/app/enroll`
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				appId: this.config.updateAppId,
				code: this.config.updateEnrollmentCode,
			}),
			signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
		})

		if (!response.ok) {
			throw new Error(await parseErrorMessage(response))
		}

		const data = (await response.json()) as EnrollResponse
		const accessToken = data.access_token?.trim() || data.accessToken?.trim()
		if (!accessToken) {
			throw new Error("AuthNexus enroll response did not include an access token")
		}

		const expiresIn = data.expires_in ?? data.expiresIn
		return {
			accessToken,
			expiresAtMs: resolveExpiryMs(accessToken, expiresIn),
			appId: this.config.updateAppId,
		}
	}

	private async readCachedToken(): Promise<AuthNexusAppToken | null> {
		try {
			const raw = await fs.readFile(this.tokenPath, "utf8")
			const parsed = JSON.parse(raw) as AuthNexusAppToken
			if (!parsed?.accessToken || !parsed?.expiresAtMs) {
				return null
			}
			return parsed
		} catch {
			return null
		}
	}

	private async writeCachedToken(token: AuthNexusAppToken): Promise<void> {
		await fs.mkdir(path.dirname(this.tokenPath), { recursive: true })
		await fs.writeFile(this.tokenPath, JSON.stringify(token, null, 2), "utf8")
	}

	private async clearCachedToken(): Promise<void> {
		await fs.rm(this.tokenPath, { force: true })
	}
}

function parseRelease(data: unknown): SoftwareReleaseInfo {
	if (typeof data !== "object" || data === null) {
		throw new Error("Invalid software release response")
	}
	const obj = data as Record<string, unknown>
	const version = typeof obj.version === "string" ? obj.version.trim() : ""
	const downloadUrl = typeof obj.downloadUrl === "string" ? obj.downloadUrl.trim() : ""
	if (!version || !downloadUrl) {
		throw new Error("Software release response missing version or downloadUrl")
	}
	return {
		version,
		downloadUrl,
		fileHash: typeof obj.fileHash === "string" ? obj.fileHash : undefined,
		fileSize: typeof obj.fileSize === "number" ? obj.fileSize : undefined,
		releaseNotes: typeof obj.releaseNotes === "string" ? obj.releaseNotes : undefined,
		mandatory: typeof obj.mandatory === "boolean" ? obj.mandatory : undefined,
	}
}

async function parseErrorMessage(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as { message?: string; statusCode?: number }
		return body.message || `${response.status} ${response.statusText}`
	} catch {
		return `${response.status} ${response.statusText}`
	}
}

function resolveExpiryMs(accessToken: string, expiresIn?: number): number {
	const payload = decodeJwtPayload(accessToken)
	if (typeof payload?.exp === "number" && payload.exp > 0) {
		return payload.exp * 1000
	}
	if (typeof expiresIn === "number" && expiresIn > 0) {
		return Date.now() + expiresIn * 1000
	}
	return Date.now() + 3600 * 1000
}

function decodeJwtPayload(token: string): { exp?: number } | null {
	const parts = token.split(".")
	if (parts.length < 2) {
		return null
	}
	try {
		const json = Buffer.from(parts[1]!, "base64url").toString("utf8")
		return JSON.parse(json) as { exp?: number }
	} catch {
		return null
	}
}

async function sha256File(filePath: string): Promise<string> {
	const data = await fs.readFile(filePath)
	return createHash("sha256").update(data).digest("hex")
}

function assertValidVsixLayout(data: Buffer): void {
	if (data.length < 2 || data[0] !== 0x50 || data[1] !== 0x4b) {
		throw new Error(
			"Downloaded update is not a valid VSIX (ZIP) archive. The release artifact may be corrupted or was packaged incorrectly.",
		)
	}
	const badPrefix = Buffer.from("./extension/package.json")
	const packageJson = Buffer.from("extension/package.json")
	if (indexOfBuffer(data, badPrefix) !== -1) {
		throw new Error(
			"Downloaded update has invalid VSIX zip paths (./ prefix). Contact release ops to re-publish the enterprise VSIX.",
		)
	}
	if (indexOfBuffer(data, packageJson) === -1) {
		throw new Error("Downloaded update is missing extension/package.json inside the VSIX.")
	}
}

function indexOfBuffer(haystack: Buffer, needle: Buffer): number {
	outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
		for (let j = 0; j < needle.length; j++) {
			if (haystack[i + j] !== needle[j]) {
				continue outer
			}
		}
		return i
	}
	return -1
}
