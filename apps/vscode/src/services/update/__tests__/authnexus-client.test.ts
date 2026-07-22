import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { AuthNexusUpdateClient } from "../authnexus-client"
import type { AxlineUpdateConfig } from "../types"

const config: AxlineUpdateConfig = {
	authNexusBaseUrl: "https://auth.example:3000",
	updateAppId: "app_axline",
	updateEnrollmentCode: "perm-code",
}

describe("AuthNexusUpdateClient", () => {
	let tokenPath: string
	let fetchMock: typeof fetch
	const originalFetch = globalThis.fetch

	beforeEach(async () => {
		tokenPath = path.join(os.tmpdir(), `authnexus-client-test-${Date.now()}.json`)
		fetchMock = originalFetch
		globalThis.fetch = fetchMock as typeof fetch
	})

	afterEach(async () => {
		globalThis.fetch = originalFetch
		await fs.rm(tokenPath, { force: true })
	})

	it("enrolls and fetches latest release", async () => {
		const calls: string[] = []
		globalThis.fetch = (async (input, init) => {
			const url = String(input)
			calls.push(url)
			if (url.endsWith("/api/auth/app/enroll")) {
				return new Response(
					JSON.stringify({
						access_token: makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }),
						expires_in: 3600,
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				)
			}
			if (url.endsWith("/api/software/app_axline/latest")) {
				const headers = init?.headers as Record<string, string> | undefined
				expect(headers?.Authorization).toContain("Bearer")
				return new Response(
					JSON.stringify({
						version: "0.2.0",
						downloadUrl: "https://auth.example:3000/uploads/axline-0.2.0.vsix",
						fileHash: "abc123",
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				)
			}
			return new Response("not found", { status: 404 })
		}) as typeof fetch

		const client = new AuthNexusUpdateClient(config, tokenPath)
		const release = await client.fetchLatestRelease()
		expect(release.version).toBe("0.2.0")
		expect(calls.some((url) => url.includes("/api/auth/app/enroll"))).toBe(true)
		expect(calls.some((url) => url.includes("/api/software/app_axline/latest"))).toBe(true)
	})

	it("reuses cached token without re-enrolling", async () => {
		const futureExp = Math.floor(Date.now() / 1000) + 7200
		await fs.writeFile(
			tokenPath,
			JSON.stringify({
				accessToken: makeJwt({ exp: futureExp }),
				expiresAtMs: futureExp * 1000,
				appId: config.updateAppId,
			}),
			"utf8",
		)

		let enrollCalls = 0
		globalThis.fetch = (async (input) => {
			const url = String(input)
			if (url.endsWith("/api/auth/app/enroll")) {
				enrollCalls += 1
			}
			if (url.endsWith("/api/software/app_axline/latest")) {
				return new Response(
					JSON.stringify({
						version: "0.2.0",
						downloadUrl: "https://auth.example:3000/uploads/axline-0.2.0.vsix",
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				)
			}
			return new Response("not found", { status: 404 })
		}) as typeof fetch

		const client = new AuthNexusUpdateClient(config, tokenPath)
		await client.fetchLatestRelease()
		expect(enrollCalls).toBe(0)
	})

	it("verifies sha256 and deletes file on mismatch", async () => {
		globalThis.fetch = (async (input) => {
			const url = String(input)
			if (url.endsWith("/api/auth/app/enroll")) {
				return new Response(
					JSON.stringify({
						access_token: makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }),
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				)
			}
			if (url.includes("/uploads/")) {
				return new Response("PK\x03\x04extension/package.json-fake-vsix", { status: 200 })
			}
			return new Response("not found", { status: 404 })
		}) as typeof fetch

		const client = new AuthNexusUpdateClient(config, tokenPath)
		const destination = path.join(os.tmpdir(), `axline-bad-${Date.now()}.vsix`)
		await expect(
			client.downloadRelease(
				{
					version: "0.2.0",
					downloadUrl: "https://auth.example:3000/uploads/axline-0.2.0.vsix",
					fileHash: "0000000000000000000000000000000000000000000000000000000000000000",
				},
				destination,
			),
		).rejects.toThrow("SHA-256 integrity check")

		await expect(fs.access(destination)).rejects.toThrow()
	})

	it("rejects vsix with ./extension path prefix before install", async () => {
		globalThis.fetch = (async (input) => {
			const url = String(input)
			if (url.includes("/uploads/")) {
				return new Response("PK\x03\x04./extension/package.json", { status: 200 })
			}
			return new Response("not found", { status: 404 })
		}) as typeof fetch

		const client = new AuthNexusUpdateClient(config, tokenPath)
		const destination = path.join(os.tmpdir(), `axline-bad-prefix-${Date.now()}.vsix`)
		await expect(
			client.downloadRelease(
				{
					version: "0.2.0",
					downloadUrl: "https://auth.example:3000/uploads/axline-0.2.0.vsix",
				},
				destination,
			),
		).rejects.toThrow("invalid VSIX zip paths")
	})

	it("retries after 401 by clearing cached token", async () => {
		const futureExp = Math.floor(Date.now() / 1000) + 7200
		await fs.writeFile(
			tokenPath,
			JSON.stringify({
				accessToken: makeJwt({ exp: futureExp }),
				expiresAtMs: futureExp * 1000,
				appId: config.updateAppId,
			}),
			"utf8",
		)

		let latestCalls = 0
		globalThis.fetch = (async (input) => {
			const url = String(input)
			if (url.endsWith("/api/auth/app/enroll")) {
				return new Response(JSON.stringify({ access_token: makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }) }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				})
			}
			if (url.endsWith("/api/software/app_axline/latest")) {
				latestCalls += 1
				if (latestCalls === 1) {
					return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 })
				}
				return new Response(
					JSON.stringify({
						version: "0.2.0",
						downloadUrl: "https://auth.example:3000/uploads/axline-0.2.0.vsix",
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				)
			}
			return new Response("not found", { status: 404 })
		}) as typeof fetch

		const client = new AuthNexusUpdateClient(config, tokenPath)
		const release = await client.fetchLatestRelease()
		expect(release.version).toBe("0.2.0")
		expect(latestCalls).toBe(2)
	})

	it("accepts download when sha256 matches", async () => {
		const payload = "PK\x03\x04valid-vsix-extension/package.json-payload"
		const hash = await sha256Hex(payload)
		globalThis.fetch = (async (input) => {
			const url = String(input)
			if (url.includes("/uploads/")) {
				return new Response(payload, { status: 200 })
			}
			return new Response("not found", { status: 404 })
		}) as typeof fetch

		const destination = path.join(os.tmpdir(), `axline-good-${Date.now()}.vsix`)
		const client = new AuthNexusUpdateClient(config, tokenPath)
		await client.downloadRelease(
			{
				version: "0.2.0",
				downloadUrl: "https://auth.example:3000/uploads/axline-0.2.0.vsix",
				fileHash: hash,
			},
			destination,
		)
		const written = await fs.readFile(destination, "utf8")
		expect(written).toBe(payload)
		await fs.rm(destination, { force: true })
	})
})

async function sha256Hex(value: string): Promise<string> {
	const { createHash } = await import("node:crypto")
	return createHash("sha256").update(value).digest("hex")
}

function makeJwt(payload: Record<string, unknown>): string {
	const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")
	const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
	return `${header}.${body}.sig`
}
