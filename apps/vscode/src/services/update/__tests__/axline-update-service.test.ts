import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import sinon from "sinon"
import { ClineEndpoint } from "@/config"
import { HostProvider } from "@/hosts/host-provider"
import { setVscodeHostProviderMock } from "@/test/host-provider-test-utils"
import { AuthNexusUpdateClient } from "../authnexus-client"
import type { SoftwareReleaseInfo } from "../types"

const sampleRelease: SoftwareReleaseInfo = {
	version: "0.2.0",
	downloadUrl: "https://auth.example:3000/uploads/axline-0.2.0.vsix",
}

const fullEndpoints = {
	authNexusBaseUrl: "https://auth.example:3000",
	updateAppId: "app_axline",
	updateEnrollmentCode: "perm-code",
}

const installCalls: string[] = []
let reloadCalled = false
let autoCheckEnabled = true

mock.module("@/hosts/vscode/axline-private-update-host", () => ({
	installVsixFromPath: async (vsixPath: string) => {
		installCalls.push(vsixPath)
	},
	reloadVsCodeWindow: async () => {
		reloadCalled = true
	},
	withUpdateNotificationProgress: async (_title: string, task: () => Promise<unknown>) => task(),
}))

mock.module("vscode", () => ({
	workspace: {
		getConfiguration: () => ({
			get: (key: string, defaultValue: unknown) => {
				if (key === "autoCheck") {
					return autoCheckEnabled
				}
				if (key === "checkIntervalHours") {
					return 24
				}
				return defaultValue
			},
		}),
	},
}))

import {
	checkForAxlineUpdate,
	installAxlineUpdate,
	isUpdateCheckSkipped,
	promptForAxlineUpdate,
	runManualAxlineUpdateCheck,
	startAxlineUpdateChecker,
} from "../axline-update-service"

const homedirStub = sinon.stub()
const osMockNamespace = { ...os, homedir: homedirStub }
mock.module("node:os", () => ({ ...osMockNamespace, default: osMockNamespace }))
mock.module("os", () => ({ ...osMockNamespace, default: osMockNamespace }))

function resetEndpointSingleton(): void {
	;(ClineEndpoint as unknown as { _instance: null; _initialized: boolean })._instance = null
	;(ClineEndpoint as unknown as { _instance: null; _initialized: boolean })._initialized = false
}

async function initEndpoints(tempDir: string, config: Record<string, string>): Promise<void> {
	await fs.writeFile(path.join(tempDir, "endpoints.json"), JSON.stringify(config), "utf8")
	await ClineEndpoint.initialize(tempDir)
}

describe("isUpdateCheckSkipped", () => {
	const originalIsDev = process.env.IS_DEV
	const originalNoCheck = process.env.AXLINE_NO_UPDATE_CHECK

	afterEach(() => {
		process.env.IS_DEV = originalIsDev
		process.env.AXLINE_NO_UPDATE_CHECK = originalNoCheck
	})

	it("returns true when IS_DEV is true", () => {
		process.env.IS_DEV = "true"
		expect(isUpdateCheckSkipped()).toBe(true)
	})

	it("returns true when AXLINE_NO_UPDATE_CHECK is 1", () => {
		delete process.env.IS_DEV
		process.env.AXLINE_NO_UPDATE_CHECK = "1"
		expect(isUpdateCheckSkipped()).toBe(true)
	})

	it("returns false in normal runtime", () => {
		delete process.env.IS_DEV
		delete process.env.AXLINE_NO_UPDATE_CHECK
		expect(isUpdateCheckSkipped()).toBe(false)
	})
})

describe("checkForAxlineUpdate", () => {
	let tempDir: string
	let fetchLatestReleaseStub: sinon.SinonStub

	beforeEach(async () => {
		tempDir = path.join(os.tmpdir(), `axline-update-svc-${Date.now()}`)
		await fs.mkdir(tempDir, { recursive: true })
		resetEndpointSingleton()
		fetchLatestReleaseStub = sinon.stub(AuthNexusUpdateClient.prototype, "fetchLatestRelease")
		homedirStub.returns(os.tmpdir())
	})

	afterEach(async () => {
		sinon.restore()
		resetEndpointSingleton()
		await fs.rm(tempDir, { recursive: true, force: true })
	})

	it("returns disabled when update config is missing", async () => {
		await initEndpoints(tempDir, { authNexusBaseUrl: "https://auth.example:3000" })
		await expect(checkForAxlineUpdate("0.1.0")).resolves.toEqual({ status: "disabled" })
	})

	it("returns up_to_date when remote version is not newer", async () => {
		await initEndpoints(tempDir, fullEndpoints)
		fetchLatestReleaseStub.resolves({ ...sampleRelease, version: "0.1.0" })
		await expect(checkForAxlineUpdate("0.1.0")).resolves.toEqual({
			status: "up_to_date",
			currentVersion: "0.1.0",
		})
	})

	it("returns update_available when remote version is newer", async () => {
		await initEndpoints(tempDir, fullEndpoints)
		fetchLatestReleaseStub.resolves(sampleRelease)
		await expect(checkForAxlineUpdate("0.1.0")).resolves.toEqual({
			status: "update_available",
			currentVersion: "0.1.0",
			release: sampleRelease,
		})
	})

	it("returns error when AuthNexus client throws", async () => {
		await initEndpoints(tempDir, fullEndpoints)
		fetchLatestReleaseStub.rejects(new Error("enroll failed"))
		const result = await checkForAxlineUpdate("0.1.0")
		expect(result.status).toBe("error")
		if (result.status === "error") {
			expect(result.message).toContain("enroll failed")
		}
	})
})

describe("installAxlineUpdate", () => {
	let tempDir: string
	let downloadReleaseStub: sinon.SinonStub

	beforeEach(async () => {
		tempDir = path.join(os.tmpdir(), `axline-install-${Date.now()}`)
		await fs.mkdir(tempDir, { recursive: true })
		resetEndpointSingleton()
		installCalls.length = 0
		setVscodeHostProviderMock({ globalStorageFsPath: path.join(os.tmpdir(), "axline-update-test-storage") })
		downloadReleaseStub = sinon.stub(AuthNexusUpdateClient.prototype, "downloadRelease").resolves()
		homedirStub.returns(os.tmpdir())
	})

	afterEach(async () => {
		sinon.restore()
		HostProvider.reset()
		resetEndpointSingleton()
		await fs.rm(tempDir, { recursive: true, force: true })
	})

	it("throws when update config is missing", async () => {
		await initEndpoints(tempDir, { authNexusBaseUrl: "https://auth.example:3000" })
		await expect(installAxlineUpdate(sampleRelease)).rejects.toThrow("Private update is not configured")
	})

	it("downloads VSIX and installs from global storage path", async () => {
		await initEndpoints(tempDir, fullEndpoints)
		await installAxlineUpdate(sampleRelease)
		expect(downloadReleaseStub.calledOnce).toBe(true)
		expect(installCalls.length).toBe(1)
		expect(installCalls[0]).toContain("axline-0.2.0.vsix")
		expect(installCalls[0]).toContain("updates")
	})
})

describe("promptForAxlineUpdate", () => {
	let tempDir: string
	let downloadReleaseStub: sinon.SinonStub
	let showMessageStub: sinon.SinonStub

	beforeEach(async () => {
		tempDir = path.join(os.tmpdir(), `axline-prompt-${Date.now()}`)
		await fs.mkdir(tempDir, { recursive: true })
		resetEndpointSingleton()
		await initEndpoints(tempDir, fullEndpoints)
		installCalls.length = 0
		reloadCalled = false
		setVscodeHostProviderMock({ globalStorageFsPath: path.join(os.tmpdir(), "axline-update-prompt-storage") })
		downloadReleaseStub = sinon.stub(AuthNexusUpdateClient.prototype, "downloadRelease").resolves()
		showMessageStub = sinon.stub(HostProvider.window, "showMessage")
		homedirStub.returns(os.tmpdir())
	})

	afterEach(async () => {
		sinon.restore()
		HostProvider.reset()
		resetEndpointSingleton()
		await fs.rm(tempDir, { recursive: true, force: true })
	})

	it("returns later when user dismisses optional update", async () => {
		showMessageStub.onFirstCall().resolves({ selectedOption: "Later" })
		await expect(promptForAxlineUpdate(sampleRelease, "0.1.0")).resolves.toBe("later")
		expect(downloadReleaseStub.called).toBe(false)
	})

	it("installs and reloads when user accepts update", async () => {
		showMessageStub.onFirstCall().resolves({ selectedOption: "Update now" })
		showMessageStub.onSecondCall().resolves({ selectedOption: "Reload now" })
		await expect(promptForAxlineUpdate(sampleRelease, "0.1.0")).resolves.toBe("update")
		expect(installCalls.length).toBe(1)
		expect(reloadCalled).toBe(true)
	})

	it("shows error when install fails", async () => {
		showMessageStub.onFirstCall().resolves({ selectedOption: "Update now" })
		downloadReleaseStub.rejects(new Error("network down"))
		await expect(promptForAxlineUpdate(sampleRelease, "0.1.0")).resolves.toBeUndefined()
		const errorCall = showMessageStub.getCalls().find((call) => String(call.args[0].message).includes("network down"))
		expect(errorCall).toBeDefined()
	})
})

describe("runManualAxlineUpdateCheck", () => {
	let tempDir: string
	let fetchLatestReleaseStub: sinon.SinonStub
	let showMessageStub: sinon.SinonStub
	const originalIsDev = process.env.IS_DEV
	const originalNoCheck = process.env.AXLINE_NO_UPDATE_CHECK

	beforeEach(async () => {
		tempDir = path.join(os.tmpdir(), `axline-manual-${Date.now()}`)
		await fs.mkdir(tempDir, { recursive: true })
		resetEndpointSingleton()
		setVscodeHostProviderMock()
		fetchLatestReleaseStub = sinon.stub(AuthNexusUpdateClient.prototype, "fetchLatestRelease")
		showMessageStub = sinon.stub(HostProvider.window, "showMessage").resolves({ selectedOption: undefined })
		homedirStub.returns(os.tmpdir())
		delete process.env.IS_DEV
		delete process.env.AXLINE_NO_UPDATE_CHECK
	})

	afterEach(async () => {
		sinon.restore()
		HostProvider.reset()
		resetEndpointSingleton()
		process.env.IS_DEV = originalIsDev
		process.env.AXLINE_NO_UPDATE_CHECK = originalNoCheck
		await fs.rm(tempDir, { recursive: true, force: true })
	})

	it("warns in development mode", async () => {
		process.env.IS_DEV = "true"
		await runManualAxlineUpdateCheck()
		expect(showMessageStub.firstCall.args[0].message).toContain("development mode")
	})

	it("warns when private update is not configured", async () => {
		await initEndpoints(tempDir, { authNexusBaseUrl: "https://auth.example:3000" })
		await runManualAxlineUpdateCheck()
		expect(showMessageStub.firstCall.args[0].message).toContain("not configured")
	})

	it("reports up to date when versions match", async () => {
		await initEndpoints(tempDir, fullEndpoints)
		fetchLatestReleaseStub.resolves({ ...sampleRelease, version: "0.1.0" })
		await runManualAxlineUpdateCheck()
		expect(showMessageStub.firstCall.args[0].message).toContain("up to date")
	})
})

describe("startAxlineUpdateChecker", () => {
	let tempDir: string
	const originalIsDev = process.env.IS_DEV
	const originalNoCheck = process.env.AXLINE_NO_UPDATE_CHECK

	beforeEach(async () => {
		tempDir = path.join(os.tmpdir(), `axline-checker-${Date.now()}`)
		await fs.mkdir(tempDir, { recursive: true })
		resetEndpointSingleton()
		autoCheckEnabled = true
		delete process.env.IS_DEV
		delete process.env.AXLINE_NO_UPDATE_CHECK
	})

	afterEach(async () => {
		resetEndpointSingleton()
		process.env.IS_DEV = originalIsDev
		process.env.AXLINE_NO_UPDATE_CHECK = originalNoCheck
		await fs.rm(tempDir, { recursive: true, force: true })
	})

	it("returns undefined when checks are skipped", () => {
		process.env.IS_DEV = "true"
		expect(startAxlineUpdateChecker()).toBeUndefined()
	})

	it("returns undefined when autoCheck is disabled", async () => {
		await initEndpoints(tempDir, fullEndpoints)
		autoCheckEnabled = false
		expect(startAxlineUpdateChecker()).toBeUndefined()
	})

	it("returns a disposable when checks are enabled", async () => {
		await initEndpoints(tempDir, fullEndpoints)
		autoCheckEnabled = true
		const disposable = startAxlineUpdateChecker()
		expect(disposable).toBeDefined()
		disposable?.dispose()
	})
})
