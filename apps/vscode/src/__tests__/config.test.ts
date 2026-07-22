import { afterEach, beforeEach, describe, it, mock } from "bun:test"
import "should"
import fs from "fs/promises"
import * as actualOs from "os"
import path from "path"
import sinon from "sinon"

// The SUT does `import * as os from "os"; os.homedir()`. Under bun, sinon's
// `stub(os, "homedir")` on the test's own `os` binding does NOT propagate to the
// SUT's namespace import, so inject a module-level homedir stub via mock.module
// (the rest of `os` — tmpdir() etc. — keeps its real behavior).
const homedirStub = sinon.stub()
const osMockNamespace = { ...actualOs, homedir: homedirStub }
const osMock = () => ({ ...osMockNamespace, default: osMockNamespace })
mock.module("os", osMock)
mock.module("node:os", osMock)

import os from "os"
import { ClineConfigurationError, ClineEndpoint, ClineEnv, Environment } from "../config"
import { getUpdateConfig } from "../services/update/config"

describe("ClineEndpoint configuration", () => {
	let sandbox: sinon.SinonSandbox
	let tempDir: string
	let originalHomedir: typeof os.homedir

	let originalAxlineDir: string | undefined
	let originalClineDir: string | undefined

	beforeEach(async () => {
		sandbox = sinon.createSandbox()
		tempDir = path.join(os.tmpdir(), `config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
		await fs.mkdir(tempDir, { recursive: true })

		// Create .axline directory (primary user config home)
		await fs.mkdir(path.join(tempDir, ".axline"), { recursive: true })

		originalAxlineDir = process.env.AXLINE_DIR
		originalClineDir = process.env.CLINE_DIR
		process.env.AXLINE_DIR = path.join(tempDir, ".axline")
		delete process.env.CLINE_DIR

		// Stub os.homedir to return our temp directory (via mock.module homedirStub)
		originalHomedir = os.homedir
		homedirStub.reset()
		homedirStub.returns(tempDir)

		// Reset the singleton state using internal method
		;(ClineEndpoint as any)._instance = null
		;(ClineEndpoint as any)._initialized = false
		;(ClineEndpoint as any)._extensionFsPath = undefined
	})

	afterEach(async () => {
		sandbox.restore()
		if (originalAxlineDir === undefined) {
			delete process.env.AXLINE_DIR
		} else {
			process.env.AXLINE_DIR = originalAxlineDir
		}
		if (originalClineDir === undefined) {
			delete process.env.CLINE_DIR
		} else {
			process.env.CLINE_DIR = originalClineDir
		}
		// Reset singleton state
		;(ClineEndpoint as any)._instance = null
		;(ClineEndpoint as any)._initialized = false
		try {
			await fs.rm(tempDir, { recursive: true, force: true })
		} catch {
			// Ignore cleanup errors
		}
	})

	describe("valid config parsing", () => {
		it("should parse valid endpoints.json with all required fields", async () => {
			const validConfig = {
				appBaseUrl: "https://app.enterprise.com",
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(validConfig), "utf8")

			await ClineEndpoint.initialize(tempDir)

			const config = ClineEndpoint.config
			config.appBaseUrl.should.equal("https://app.enterprise.com")
			config.apiBaseUrl.should.equal("https://api.enterprise.com")
			config.mcpBaseUrl.should.equal("https://mcp.enterprise.com")
			config.environment.should.equal(Environment.selfHosted)
		})

		it("should work without full on-premise endpoints (production defaults)", async () => {
			// Fresh install seeds axgate-only ~/.axline/endpoints.json

			await ClineEndpoint.initialize(tempDir)

			const config = ClineEndpoint.config
			config.environment.should.not.equal(Environment.selfHosted)
			// Should use production defaults
			config.appBaseUrl.should.equal("https://app.cline.bot")
			config.apiBaseUrl.should.equal("https://api.cline.bot")
		})

		it("should auto-create ~/.axline/endpoints.json with defaults on first run", async () => {
			const endpointsPath = path.join(tempDir, ".axline", "endpoints.json")
			await fs.unlink(endpointsPath).catch(() => {})

			await ClineEndpoint.initialize(tempDir)

			const content = JSON.parse(await fs.readFile(endpointsPath, "utf8"))
			content.axgateBaseUrl.should.equal("https://auth.mtsilicon.com:6343")
			ClineEndpoint.getEndpointsExtension()?.axgateBaseUrl?.should.equal("https://auth.mtsilicon.com:6343")
		})

		it("should migrate legacy ~/.cline/endpoints.json into ~/.axline/endpoints.json", async () => {
			const legacyConfig = {
				axgateBaseUrl: "https://legacy.example:6100",
			}

			await fs.mkdir(path.join(tempDir, ".cline"), { recursive: true })
			await fs.writeFile(path.join(tempDir, ".cline", "endpoints.json"), JSON.stringify(legacyConfig), "utf8")

			await ClineEndpoint.initialize(tempDir)

			const axlinePath = path.join(tempDir, ".axline", "endpoints.json")
			const content = JSON.parse(await fs.readFile(axlinePath, "utf8"))
			content.axgateBaseUrl.should.equal("https://legacy.example:6100")
		})

		it("should accept URLs with ports", async () => {
			const validConfig = {
				appBaseUrl: "http://localhost:3000",
				apiBaseUrl: "http://localhost:7777",
				mcpBaseUrl: "http://localhost:8080/mcp",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(validConfig), "utf8")

			await ClineEndpoint.initialize(tempDir)

			const config = ClineEndpoint.config
			config.appBaseUrl.should.equal("http://localhost:3000")
			config.apiBaseUrl.should.equal("http://localhost:7777")
			config.mcpBaseUrl.should.equal("http://localhost:8080/mcp")
		})

		it("should accept URLs with paths", async () => {
			const validConfig = {
				appBaseUrl: "https://proxy.enterprise.com/cline/app",
				apiBaseUrl: "https://proxy.enterprise.com/cline/api",
				mcpBaseUrl: "https://proxy.enterprise.com/cline/mcp",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(validConfig), "utf8")

			await ClineEndpoint.initialize(tempDir)

			const config = ClineEndpoint.config
			config.appBaseUrl.should.equal("https://proxy.enterprise.com/cline/app")
		})
	})

	describe("invalid JSON handling", () => {
		it("should throw ClineConfigurationError for invalid JSON syntax", async () => {
			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), "{ invalid json }", "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("Invalid JSON")
			}
		})

		it("should throw ClineConfigurationError for truncated JSON", async () => {
			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), '{"appBaseUrl": "https://test.com"', "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("Invalid JSON")
			}
		})

		it("should throw ClineConfigurationError for empty file", async () => {
			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), "", "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
			}
		})

		it("should throw ClineConfigurationError for non-object JSON", async () => {
			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), '"just a string"', "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("must contain a JSON object")
			}
		})

		it("should throw ClineConfigurationError for array JSON", async () => {
			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), "[]", "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("must contain a JSON object")
			}
		})

		it("should throw ClineConfigurationError for null JSON", async () => {
			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), "null", "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("must contain a JSON object")
			}
		})
	})

	describe("missing required fields", () => {
		it("should throw ClineConfigurationError when appBaseUrl is missing", async () => {
			const config = {
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql('Missing required field "appBaseUrl"')
			}
		})

		it("should throw ClineConfigurationError when apiBaseUrl is missing", async () => {
			const config = {
				appBaseUrl: "https://app.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql('Missing required field "apiBaseUrl"')
			}
		})

		it("should throw ClineConfigurationError when mcpBaseUrl is missing", async () => {
			const config = {
				appBaseUrl: "https://app.enterprise.com",
				apiBaseUrl: "https://api.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql('Missing required field "mcpBaseUrl"')
			}
		})

		it("should throw ClineConfigurationError when all fields are missing", async () => {
			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), "{}", "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("Missing required field")
			}
		})

		it("should throw ClineConfigurationError when field is null", async () => {
			const config = {
				appBaseUrl: null,
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql('Missing required field "appBaseUrl"')
			}
		})

		it("should throw ClineConfigurationError when field is empty string", async () => {
			const config = {
				appBaseUrl: "",
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("cannot be empty")
			}
		})

		it("should throw ClineConfigurationError when field is whitespace only", async () => {
			const config = {
				appBaseUrl: "   ",
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("cannot be empty")
			}
		})

		it("should throw ClineConfigurationError when field is non-string", async () => {
			const config = {
				appBaseUrl: 12345,
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("must be a string")
			}
		})
	})

	describe("invalid URL detection", () => {
		it("should throw ClineConfigurationError for invalid URL format", async () => {
			const config = {
				appBaseUrl: "not-a-valid-url",
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("must be a valid URL")
			}
		})

		it("should throw ClineConfigurationError for URL without protocol", async () => {
			const config = {
				appBaseUrl: "app.enterprise.com",
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("must be a valid URL")
			}
		})

		it("should throw ClineConfigurationError for malformed URL", async () => {
			const config = {
				appBaseUrl: "https://",
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("must be a valid URL")
			}
		})

		it("should include the invalid URL value in error message", async () => {
			const invalidUrl = "definitely-not-a-url"
			const config = {
				appBaseUrl: invalidUrl,
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql(invalidUrl)
			}
		})
	})

	describe("environment switching blocked in self-hosted mode", () => {
		it("should throw error when trying to change environment in self-hosted mode", async () => {
			const config = {
				appBaseUrl: "https://app.enterprise.com",
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")

			await ClineEndpoint.initialize(tempDir)

			// Verify we're in self-hosted mode
			ClineEndpoint.config.environment.should.equal(Environment.selfHosted)

			// Try to change environment - should throw
			try {
				ClineEnv.setEnvironment("staging")
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.message.should.containEql("Cannot change environment in on-premise mode")
			}
		})

		it("should throw error for all environment values in self-hosted mode", async () => {
			const config = {
				appBaseUrl: "https://app.enterprise.com",
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")

			await ClineEndpoint.initialize(tempDir)

			const environments = ["staging", "local", "production", "anything"]
			for (const env of environments) {
				try {
					ClineEnv.setEnvironment(env)
					throw new Error(`Should have thrown for environment: ${env}`)
				} catch (error: any) {
					error.message.should.containEql("Cannot change environment in on-premise mode")
				}
			}
		})

		it("should allow environment switching in standard mode", async () => {
			// No endpoints.json file - standard mode

			await ClineEndpoint.initialize(tempDir)

			// Verify we're NOT in self-hosted mode
			ClineEndpoint.config.environment.should.not.equal(Environment.selfHosted)

			// Should be able to change environment
			ClineEnv.setEnvironment("staging")
			ClineEnv.getEnvironment().environment.should.equal("staging")

			ClineEnv.setEnvironment("local")
			ClineEnv.getEnvironment().environment.should.equal("local")

			ClineEnv.setEnvironment("production")
			ClineEnv.getEnvironment().environment.should.equal("production")
		})
	})

	describe("self-hosted mode behavior", () => {
		it("should report selfHosted environment in self-hosted mode", async () => {
			const config = {
				appBaseUrl: "https://app.enterprise.com",
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")

			await ClineEndpoint.initialize(tempDir)

			const envConfig = ClineEndpoint.config
			envConfig.environment.should.equal(Environment.selfHosted)
		})

		it("should use custom endpoints from file", async () => {
			const customConfig = {
				appBaseUrl: "https://custom-app.internal",
				apiBaseUrl: "https://custom-api.internal",
				mcpBaseUrl: "https://custom-mcp.internal/v1",
			}

			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(customConfig), "utf8")

			await ClineEndpoint.initialize(tempDir)

			const config = ClineEndpoint.config
			config.appBaseUrl.should.equal("https://custom-app.internal")
			config.apiBaseUrl.should.equal("https://custom-api.internal")
			config.mcpBaseUrl.should.equal("https://custom-mcp.internal/v1")
		})
	})

	describe("initialization behavior", () => {
		it("should only initialize once", async () => {
			await ClineEndpoint.initialize(tempDir)
			ClineEndpoint.isInitialized().should.be.true()

			// Second initialize should be a no-op
			await ClineEndpoint.initialize(tempDir)
			ClineEndpoint.isInitialized().should.be.true()
		})

		it("should throw error when accessing config before initialization", async () => {
			// Already reset in beforeEach, so accessing should throw
			try {
				const _ = ClineEndpoint.config
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.message.should.containEql("not initialized")
			}
		})
	})

	describe("isSelfHosted() method", () => {
		it("should return true when not initialized (safety fallback)", async () => {
			// Reset singleton state - already done in beforeEach, not initialized
			ClineEndpoint.isInitialized().should.be.false()
			ClineEndpoint.isSelfHosted().should.be.true()
		})

		it("should return true when in self-hosted mode", async () => {
			const config = {
				appBaseUrl: "https://app.enterprise.com",
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}
			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(config), "utf8")
			await ClineEndpoint.initialize(tempDir)

			ClineEndpoint.isSelfHosted().should.be.true()
		})

		it("should return false when in normal mode (axgate-only endpoints)", async () => {
			await ClineEndpoint.initialize(tempDir)

			ClineEndpoint.isSelfHosted().should.be.false()
		})
	})

	describe("bundled endpoints.json behavior", () => {
		let bundledDir: string
		let setVscodeHostProviderMock: (mock: { extensionFsPath: string; globalStorageFsPath: string }) => void

		beforeEach(async () => {
			// Create a separate directory for bundled config
			bundledDir = path.join(os.tmpdir(), `config-bundled-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
			await fs.mkdir(bundledDir, { recursive: true })

			// Import HostProvider utilities
			const hostProviderModule = await import("../test/host-provider-test-utils")
			setVscodeHostProviderMock = hostProviderModule.setVscodeHostProviderMock
		})

		afterEach(async () => {
			try {
				await fs.rm(bundledDir, { recursive: true, force: true })
			} catch {
				// Ignore cleanup errors
			}
		})

		it("should use bundled endpoints.json when available", async () => {
			const bundledConfig = {
				appBaseUrl: "https://bundled.enterprise.com",
				apiBaseUrl: "https://bundled-api.enterprise.com",
				mcpBaseUrl: "https://bundled-mcp.enterprise.com",
			}

			// Set up bundled config
			await fs.writeFile(path.join(bundledDir, "endpoints.json"), JSON.stringify(bundledConfig), "utf8")

			await ClineEndpoint.initialize(bundledDir)

			const config = ClineEndpoint.config
			config.appBaseUrl.should.equal("https://bundled.enterprise.com")
			config.apiBaseUrl.should.equal("https://bundled-api.enterprise.com")
			config.mcpBaseUrl.should.equal("https://bundled-mcp.enterprise.com")
			config.environment.should.equal(Environment.selfHosted)
		})

		it("should prefer bundled endpoints.json over user file", async () => {
			const bundledConfig = {
				appBaseUrl: "https://bundled.enterprise.com",
				apiBaseUrl: "https://bundled-api.enterprise.com",
				mcpBaseUrl: "https://bundled-mcp.enterprise.com",
			}

			const userConfig = {
				appBaseUrl: "https://user.enterprise.com",
				apiBaseUrl: "https://user-api.enterprise.com",
				mcpBaseUrl: "https://user-mcp.enterprise.com",
			}

			// Set up both configs
			await fs.writeFile(path.join(bundledDir, "endpoints.json"), JSON.stringify(bundledConfig), "utf8")
			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(userConfig), "utf8")

			await ClineEndpoint.initialize(bundledDir)

			// Should use bundled config, not user config
			const config = ClineEndpoint.config
			config.appBaseUrl.should.equal("https://bundled.enterprise.com")
			config.apiBaseUrl.should.equal("https://bundled-api.enterprise.com")
			config.mcpBaseUrl.should.equal("https://bundled-mcp.enterprise.com")
		})

		it("should fall back to user endpoints.json when bundled is not present", async () => {
			const userConfig = {
				appBaseUrl: "https://user.enterprise.com",
				apiBaseUrl: "https://user-api.enterprise.com",
				mcpBaseUrl: "https://user-mcp.enterprise.com",
			}

			// Only create user config, no bundled config
			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(userConfig), "utf8")

			await ClineEndpoint.initialize(bundledDir)

			// Should use user config
			const config = ClineEndpoint.config
			config.appBaseUrl.should.equal("https://user.enterprise.com")
			config.apiBaseUrl.should.equal("https://user-api.enterprise.com")
			config.mcpBaseUrl.should.equal("https://user-mcp.enterprise.com")
		})

		it("should use standard mode when neither bundled nor user file exists", async () => {
			// No config files at all

			await ClineEndpoint.initialize(bundledDir)

			// Should use production defaults
			const config = ClineEndpoint.config
			config.environment.should.not.equal(Environment.selfHosted)
			config.appBaseUrl.should.equal("https://app.cline.bot")
			config.apiBaseUrl.should.equal("https://api.cline.bot")
		})

		it("should throw ClineConfigurationError for invalid bundled file", async () => {
			const invalidConfig = {
				appBaseUrl: "not-a-url",
				apiBaseUrl: "https://api.enterprise.com",
				mcpBaseUrl: "https://mcp.enterprise.com",
			}

			// Set up invalid bundled config
			await fs.writeFile(path.join(bundledDir, "endpoints.json"), JSON.stringify(invalidConfig), "utf8")

			try {
				await ClineEndpoint.initialize(bundledDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("must be a valid URL")
				error.message.should.containEql("bundled")
			}
		})

		it("should throw ClineConfigurationError for invalid JSON in bundled file", async () => {
			// Set up invalid JSON in bundled file
			await fs.writeFile(path.join(bundledDir, "endpoints.json"), "{ invalid json }", "utf8")

			try {
				await ClineEndpoint.initialize(bundledDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("Invalid JSON")
				error.message.should.containEql("bundled")
			}
		})

		it("should indicate bundled source in error messages", async () => {
			const incompleteConfig = {
				appBaseUrl: "https://bundled.enterprise.com",
				// Missing apiBaseUrl and mcpBaseUrl
			}

			await fs.writeFile(path.join(bundledDir, "endpoints.json"), JSON.stringify(incompleteConfig), "utf8")

			try {
				await ClineEndpoint.initialize(bundledDir)
				throw new Error("Should have thrown")
			} catch (error: any) {
				error.should.be.instanceof(ClineConfigurationError)
				error.message.should.containEql("Missing required field")
				error.message.should.containEql(path.join(bundledDir, "endpoints.json"))
			}
		})

		it("should merge user axgate fields when bundled endpoints omit axgateBaseUrl", async () => {
			const bundledConfig = {
				authNexusBaseUrl: "https://auth.mtsilicon.com",
				updateAppId: "app_axline_vsix",
			}
			const userConfig = {
				axgateBaseUrl: "https://auth.mtsilicon.com:6343",
				authAppId: "app_uu1Sn7yC",
			}

			await fs.writeFile(path.join(bundledDir, "endpoints.json"), JSON.stringify(bundledConfig), "utf8")
			await fs.mkdir(path.join(tempDir, ".axline"), { recursive: true })
			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(userConfig), "utf8")

			await ClineEndpoint.initialize(bundledDir)

			const extension = ClineEndpoint.getEndpointsExtension()
			extension?.axgateBaseUrl?.should.equal("https://auth.mtsilicon.com:6343")
			extension?.authAppId?.should.equal("app_uu1Sn7yC")
			extension?.authNexusBaseUrl?.should.equal("https://auth.mtsilicon.com")
			extension?.updateAppId?.should.equal("app_axline_vsix")
		})
	})

	describe("Axline endpoints extension fields", () => {
		it("should parse axgate and private-update fields from bundled endpoints.json", async () => {
			const extensionConfig = {
				axgateBaseUrl: "https://auth.mtsilicon.com:6343",
				authAppId: "app_uu1Sn7yC",
				authNexusBaseUrl: "https://auth.mtsilicon.com",
				updateAppId: "app_axline_vsix",
				updateEnrollmentCode: "perm-enroll-code",
			}

			await fs.writeFile(path.join(tempDir, "endpoints.json"), JSON.stringify(extensionConfig), "utf8")
			await ClineEndpoint.initialize(tempDir)

			const extension = ClineEndpoint.getEndpointsExtension()
			extension?.axgateBaseUrl?.should.equal("https://auth.mtsilicon.com:6343")
			extension?.authAppId?.should.equal("app_uu1Sn7yC")
			extension?.authNexusBaseUrl?.should.equal("https://auth.mtsilicon.com")
			extension?.updateAppId?.should.equal("app_axline_vsix")
			extension?.updateEnrollmentCode?.should.equal("perm-enroll-code")
			ClineEndpoint.isBundledConfig().should.be.true()
		})

		it("should reject invalid authNexusBaseUrl", async () => {
			await fs.writeFile(
				path.join(tempDir, "endpoints.json"),
				JSON.stringify({ axgateBaseUrl: "https://axgate.example:6100", authNexusBaseUrl: "not-a-url" }),
				"utf8",
			)

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: unknown) {
				;(error as ClineConfigurationError).should.be.instanceof(ClineConfigurationError)
				;(error as Error).message.should.containEql("authNexusBaseUrl")
			}
		})

		it("should reject remote plain HTTP axgateBaseUrl", async () => {
			await fs.writeFile(
				path.join(tempDir, "endpoints.json"),
				JSON.stringify({ axgateBaseUrl: "http://axgate.example:6100" }),
				"utf8",
			)

			try {
				await ClineEndpoint.initialize(tempDir)
				throw new Error("Should have thrown")
			} catch (error: unknown) {
				;(error as ClineConfigurationError).should.be.instanceof(ClineConfigurationError)
				;(error as Error).message.should.containEql("HTTPS")
			}
		})

		it("should rewrite retired HTTP AuthNexus / AxGate bases to HTTPS defaults", async () => {
			await fs.mkdir(path.join(tempDir, ".axline"), { recursive: true })
			await fs.writeFile(
				path.join(tempDir, ".axline", "endpoints.json"),
				JSON.stringify({
					axgateBaseUrl: "http://auth.mtsilicon.com:6100",
					authNexusBaseUrl: "http://auth.mtsilicon.com:3000",
				}),
				"utf8",
			)

			await ClineEndpoint.initialize(tempDir)

			const extension = ClineEndpoint.getEndpointsExtension()
			extension?.axgateBaseUrl?.should.equal("https://auth.mtsilicon.com:6343")
			extension?.authNexusBaseUrl?.should.equal("https://auth.mtsilicon.com")
			const onDisk = JSON.parse(await fs.readFile(path.join(tempDir, ".axline", "endpoints.json"), "utf8"))
			onDisk.axgateBaseUrl.should.equal("https://auth.mtsilicon.com:6343")
			onDisk.authNexusBaseUrl.should.equal("https://auth.mtsilicon.com")
		})

		it("should rewrite retired axgate.mtsilicon.com AxGate hostname to auth.mtsilicon.com:6343", async () => {
			await fs.mkdir(path.join(tempDir, ".axline"), { recursive: true })
			await fs.writeFile(
				path.join(tempDir, ".axline", "endpoints.json"),
				JSON.stringify({
					axgateBaseUrl: "https://axgate.mtsilicon.com:6343",
					authNexusBaseUrl: "https://auth.mtsilicon.com",
				}),
				"utf8",
			)

			await ClineEndpoint.initialize(tempDir)

			const extension = ClineEndpoint.getEndpointsExtension()
			extension?.axgateBaseUrl?.should.equal("https://auth.mtsilicon.com:6343")
			const onDisk = JSON.parse(await fs.readFile(path.join(tempDir, ".axline", "endpoints.json"), "utf8"))
			onDisk.axgateBaseUrl.should.equal("https://auth.mtsilicon.com:6343")
		})

		it("should rewrite retired AuthNexus :3443 to standard HTTPS :443", async () => {
			await fs.mkdir(path.join(tempDir, ".axline"), { recursive: true })
			await fs.writeFile(
				path.join(tempDir, ".axline", "endpoints.json"),
				JSON.stringify({
					authNexusBaseUrl: "https://auth.mtsilicon.com:3443",
				}),
				"utf8",
			)

			await ClineEndpoint.initialize(tempDir)

			const extension = ClineEndpoint.getEndpointsExtension()
			extension?.authNexusBaseUrl?.should.equal("https://auth.mtsilicon.com")
			const onDisk = JSON.parse(await fs.readFile(path.join(tempDir, ".axline", "endpoints.json"), "utf8"))
			onDisk.authNexusBaseUrl.should.equal("https://auth.mtsilicon.com")
		})
	})

	describe("Axline user config paths", () => {
		it("should prefer ~/.axline/endpoints.json over legacy ~/.cline", async () => {
			const axlineConfig = {
				axgateBaseUrl: "https://axline.example:6100",
			}
			const legacyConfig = {
				axgateBaseUrl: "https://legacy.example:6100",
			}

			await fs.mkdir(path.join(tempDir, ".cline"), { recursive: true })
			await fs.writeFile(path.join(tempDir, ".axline", "endpoints.json"), JSON.stringify(axlineConfig), "utf8")
			await fs.writeFile(path.join(tempDir, ".cline", "endpoints.json"), JSON.stringify(legacyConfig), "utf8")

			await ClineEndpoint.initialize(tempDir)

			const extension = ClineEndpoint.getEndpointsExtension()
			extension?.axgateBaseUrl?.should.equal("https://axline.example:6100")
		})

		it("should fall back to legacy ~/.cline/endpoints.json when ~/.axline is missing", async () => {
			const legacyConfig = {
				axgateBaseUrl: "https://legacy.example:6100",
			}

			await fs.mkdir(path.join(tempDir, ".cline"), { recursive: true })
			await fs.writeFile(path.join(tempDir, ".cline", "endpoints.json"), JSON.stringify(legacyConfig), "utf8")

			await ClineEndpoint.initialize(tempDir)

			const extension = ClineEndpoint.getEndpointsExtension()
			extension?.axgateBaseUrl?.should.equal("https://legacy.example:6100")
		})

		it("should load update enrollment code from ~/.axline/secrets.json", async () => {
			await fs.writeFile(
				path.join(tempDir, ".axline", "endpoints.json"),
				JSON.stringify({
					authNexusBaseUrl: "https://auth.example:3000",
					updateAppId: "app_axline",
				}),
				"utf8",
			)
			await fs.writeFile(
				path.join(tempDir, ".axline", "secrets.json"),
				JSON.stringify({ updateEnrollmentCode: "secret-from-file" }),
				"utf8",
			)

			await ClineEndpoint.initialize(tempDir)

			ClineEndpoint.getUserSecrets()?.updateEnrollmentCode?.should.equal("secret-from-file")
			getUpdateConfig()?.updateEnrollmentCode?.should.equal("secret-from-file")
		})
	})
})
