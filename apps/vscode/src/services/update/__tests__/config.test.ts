import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { ClineEndpoint } from "@/config"
import { getUpdateConfig, isPrivateUpdateEnabled } from "../config"

describe("getUpdateConfig", () => {
	let tempDir: string

	beforeEach(async () => {
		tempDir = path.join(os.tmpdir(), `update-config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
		await fs.mkdir(tempDir, { recursive: true })
		;(ClineEndpoint as unknown as { _instance: null; _initialized: boolean; _extensionFsPath?: string })._instance = null
		;(ClineEndpoint as unknown as { _instance: null; _initialized: boolean })._initialized = false
		delete process.env.AXLINE_AUTHNEXUS_BASE_URL
		delete process.env.AXLINE_UPDATE_APP_ID
		delete process.env.AXLINE_UPDATE_ENROLLMENT_CODE
	})

	afterEach(async () => {
		delete process.env.AXLINE_AUTHNEXUS_BASE_URL
		delete process.env.AXLINE_UPDATE_APP_ID
		delete process.env.AXLINE_UPDATE_ENROLLMENT_CODE
		try {
			await fs.rm(tempDir, { recursive: true, force: true })
		} catch {
			// ignore
		}
	})

	it("returns null when update fields are incomplete", async () => {
		await fs.writeFile(
			path.join(tempDir, "endpoints.json"),
			JSON.stringify({ authNexusBaseUrl: "https://auth.example:3000" }),
			"utf8",
		)
		await ClineEndpoint.initialize(tempDir)
		expect(getUpdateConfig()).toBeNull()
		expect(isPrivateUpdateEnabled()).toBe(false)
	})

	it("reads update config from bundled endpoints.json", async () => {
		await fs.writeFile(
			path.join(tempDir, "endpoints.json"),
			JSON.stringify({
				authNexusBaseUrl: "https://auth.example:3000/",
				updateAppId: "app_axline",
				updateEnrollmentCode: "perm-code",
			}),
			"utf8",
		)
		await ClineEndpoint.initialize(tempDir)
		expect(getUpdateConfig()).toEqual({
			authNexusBaseUrl: "https://auth.example:3000",
			updateAppId: "app_axline",
			updateEnrollmentCode: "perm-code",
		})
		expect(isPrivateUpdateEnabled()).toBe(true)
	})

	it("prefers environment variables over endpoints.json", async () => {
		await fs.writeFile(
			path.join(tempDir, "endpoints.json"),
			JSON.stringify({
				authNexusBaseUrl: "https://file.example:3000",
				updateAppId: "app_file",
				updateEnrollmentCode: "file-code",
			}),
			"utf8",
		)
		process.env.AXLINE_AUTHNEXUS_BASE_URL = "https://env.example:3000"
		process.env.AXLINE_UPDATE_APP_ID = "app_env"
		process.env.AXLINE_UPDATE_ENROLLMENT_CODE = "env-code"
		await ClineEndpoint.initialize(tempDir)
		expect(getUpdateConfig()).toEqual({
			authNexusBaseUrl: "https://env.example:3000",
			updateAppId: "app_env",
			updateEnrollmentCode: "env-code",
		})
	})
})
