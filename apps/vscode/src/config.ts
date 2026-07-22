import * as fs from "fs/promises"
import * as path from "path"
import {
	ensureAxlineEndpointsFile,
	isSecureEndpointUrl,
	migrateEndpointUrl,
	migrateInsecureUserEndpointsFiles,
	resolveUserEndpointsCandidates,
} from "./shared/axline-dir"
import { type AxlineSecrets, loadAxlineSecrets } from "./shared/axline-secrets"
import { Environment, type EnvironmentConfig } from "./shared/config-types"
import { Logger } from "./shared/services/Logger"

export { Environment } /**
 * Schema for the endpoints.json configuration file used in on-premise deployments.
 * All fields are required and must be valid URLs.
 */

interface EndpointsFileSchema {
	appBaseUrl: string
	apiBaseUrl: string
	mcpBaseUrl: string
}

interface AxlineEndpointsExtension {
	axgateBaseUrl?: string
	authAppId?: string
	/** AuthNexus base URL for private software releases and Feedback Hub (single source; R-7). */
	authNexusBaseUrl?: string
	/** AuthNexus software app ID for Axline VSIX releases. */
	updateAppId?: string
	/** Permanent enrollment code for the update app (minted in AuthNexus console). */
	updateEnrollmentCode?: string
}

/**
 * Error thrown when the Cline configuration file exists but is invalid.
 * This error prevents Cline from starting to avoid misconfiguration in enterprise environments.
 */
export class ClineConfigurationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "ClineConfigurationError"
	}
}

class ClineEndpoint {
	private static _instance: ClineEndpoint | null = null
	private static _initialized = false
	private static _extensionFsPath: string

	// On-premise config loaded from file (null if not on-premise)
	private onPremiseConfig: EndpointsFileSchema | null = null
	private endpointsExtension: AxlineEndpointsExtension | null = null
	private userSecrets: AxlineSecrets | null = null
	private environment: Environment = Environment.production
	// Track if config came from bundled file (enterprise distribution)
	private isBundled = false

	private constructor() {
		// Set environment at module load. Use override if provided.
		const _env = process?.env?.CLINE_ENVIRONMENT_OVERRIDE || process?.env?.CLINE_ENVIRONMENT
		if (_env && Object.values(Environment).includes(_env as Environment)) {
			this.environment = _env as Environment
		}
	}

	/**
	 * Initializes the ClineEndpoint singleton.
	 * Must be called before any other methods.
	 * Reads the endpoints.json file if it exists and validates its schema.
	 *
	 * @param extensionFsPath Path to the extension installation directory (for checking bundled endpoints.json)
	 * @throws ClineConfigurationError if the endpoints.json file exists but is invalid
	 */
	public static async initialize(extensionFsPath: string): Promise<void> {
		if (ClineEndpoint._initialized) {
			return
		}

		ClineEndpoint._extensionFsPath = extensionFsPath
		ClineEndpoint._instance = new ClineEndpoint()

		await ensureAxlineEndpointsFile(extensionFsPath)
		await migrateInsecureUserEndpointsFiles()

		// Try to load on-premise config from file
		const endpointsConfig = await ClineEndpoint.loadEndpointsFile()
		if (endpointsConfig) {
			ClineEndpoint._instance.onPremiseConfig = endpointsConfig.config
			ClineEndpoint._instance.endpointsExtension = endpointsConfig.extension
			if (endpointsConfig.config) {
				Logger.log("Axline running in self-hosted mode with custom endpoints")
			}
		}

		ClineEndpoint._instance.userSecrets = await loadAxlineSecrets()

		ClineEndpoint._initialized = true
	}

	/**
	 * Returns true if the ClineEndpoint has been initialized.
	 */
	public static isInitialized(): boolean {
		return ClineEndpoint._initialized
	}

	/**
	 * Checks if Cline is running in self-hosted/on-premise mode.
	 * @returns true if in selfHosted mode, or true if not initialized (safety fallback to prevent accidental external calls)
	 */
	public static isSelfHosted(): boolean {
		// Safety fallback: if not initialized, treat as selfHosted
		// to prevent accidental external service calls before configuration is loaded
		if (!ClineEndpoint._initialized) {
			return true
		}
		return ClineEndpoint.config.environment === Environment.selfHosted
	}

	/**
	 * Returns true if the current configuration was loaded from a bundled endpoints.json file.
	 * This indicates an enterprise distribution that should not auto-update.
	 * @throws Error if not initialized
	 */
	public static isBundledConfig(): boolean {
		if (!ClineEndpoint._initialized || !ClineEndpoint._instance) {
			throw new Error("ClineEndpoint not initialized. Call ClineEndpoint.initialize() first.")
		}
		return ClineEndpoint._instance.isBundled
	}

	/**
	 * Returns the singleton instance.
	 * @throws Error if not initialized
	 */
	public static get instance(): ClineEndpoint {
		if (!ClineEndpoint._initialized || !ClineEndpoint._instance) {
			throw new Error("ClineEndpoint not initialized. Call ClineEndpoint.initialize() first.")
		}
		return ClineEndpoint._instance
	}

	/**
	 * Static getter for convenient access to the current configuration.
	 * @throws Error if not initialized
	 */
	public static get config(): EnvironmentConfig {
		return ClineEndpoint.instance.config()
	}

	/**
	 * Returns the path to the bundled endpoints.json configuration file.
	 * Located in the extension installation directory.
	 */
	private static getBundledEndpointsFilePath(): string {
		return path.join(ClineEndpoint._extensionFsPath, "endpoints.json")
	}

	/**
	 * Loads and validates the endpoints.json file.
	 * Checks bundled location first, then falls back to user directory.
	 * Priority: bundled endpoints.json → ~/.axline/endpoints.json → ~/.cline/endpoints.json → null
	 * @returns The validated endpoints config, or null if no file exists
	 * @throws ClineConfigurationError if a file exists but is invalid
	 */
	private static async loadEndpointsFile(): Promise<{
		config: EndpointsFileSchema | null
		extension: AxlineEndpointsExtension | null
	} | null> {
		// 1. Try bundled file
		const bundledPath = ClineEndpoint.getBundledEndpointsFilePath()
		try {
			await fs.access(bundledPath)
			// File exists, load and validate it
			const fileContent = await fs.readFile(bundledPath, "utf8")
			let data: unknown

			try {
				data = JSON.parse(fileContent)
			} catch (parseError) {
				throw new ClineConfigurationError(
					`Invalid JSON in bundled endpoints configuration file (${bundledPath}): ${parseError instanceof Error ? parseError.message : String(parseError)}`,
				)
			}

			const parsed = ClineEndpoint.parseEndpointsFile(data, bundledPath)
			const userExtension = await ClineEndpoint.loadUserEndpointsExtension()
			// Mark as bundled enterprise distribution
			ClineEndpoint._instance!.isBundled = true
			return {
				config: parsed.config,
				extension: ClineEndpoint.mergeEndpointsExtension(parsed.extension, userExtension),
			}
		} catch (error) {
			if (error instanceof ClineConfigurationError) {
				throw error
			}
			// Bundled file doesn't exist or is not accessible, try user file
		}

		// 2. Try user endpoints (~/.axline, then legacy ~/.cline)
		for (const userPath of resolveUserEndpointsCandidates()) {
			try {
				await fs.access(userPath)
			} catch {
				continue
			}

			try {
				const fileContent = await fs.readFile(userPath, "utf8")
				let data: unknown

				try {
					data = JSON.parse(fileContent)
				} catch (parseError) {
					throw new ClineConfigurationError(
						`Invalid JSON in user endpoints configuration file (${userPath}): ${parseError instanceof Error ? parseError.message : String(parseError)}`,
					)
				}

				return ClineEndpoint.parseEndpointsFile(data, userPath)
			} catch (error) {
				if (error instanceof ClineConfigurationError) {
					throw error
				}
				throw new ClineConfigurationError(
					`Failed to read user endpoints configuration file (${userPath}): ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		return null
	}

	private static async loadUserEndpointsExtension(): Promise<AxlineEndpointsExtension | null> {
		for (const userPath of resolveUserEndpointsCandidates()) {
			try {
				await fs.access(userPath)
			} catch {
				continue
			}

			try {
				const fileContent = await fs.readFile(userPath, "utf8")
				const data = JSON.parse(fileContent) as unknown
				const parsed = ClineEndpoint.parseEndpointsFile(data, userPath)
				return parsed.extension
			} catch (error) {
				if (error instanceof ClineConfigurationError) {
					throw error
				}
				throw new ClineConfigurationError(
					`Failed to read user endpoints configuration file (${userPath}): ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}

		return null
	}

	private static mergeEndpointsExtension(
		primary: AxlineEndpointsExtension | null,
		supplemental: AxlineEndpointsExtension | null,
	): AxlineEndpointsExtension | null {
		if (!primary && !supplemental) {
			return null
		}

		return {
			axgateBaseUrl: primary?.axgateBaseUrl?.trim() || supplemental?.axgateBaseUrl?.trim(),
			authAppId: primary?.authAppId?.trim() || supplemental?.authAppId?.trim(),
			authNexusBaseUrl: primary?.authNexusBaseUrl?.trim() || supplemental?.authNexusBaseUrl?.trim(),
			updateAppId: primary?.updateAppId?.trim() || supplemental?.updateAppId?.trim(),
			updateEnrollmentCode: primary?.updateEnrollmentCode?.trim() || supplemental?.updateEnrollmentCode?.trim(),
		}
	}

	/**
	 * Parses endpoints.json, supporting optional AxGate-only configuration.
	 */
	private static parseEndpointsFile(
		data: unknown,
		filePath: string,
	): { config: EndpointsFileSchema | null; extension: AxlineEndpointsExtension | null } {
		if (Array.isArray(data)) {
			throw new ClineConfigurationError(`Endpoints configuration file (${filePath}) must contain a JSON object`)
		}

		if (typeof data !== "object" || data === null) {
			throw new ClineConfigurationError(`Endpoints configuration file (${filePath}) must contain a JSON object`)
		}

		const obj = data as Record<string, unknown>
		const extension = ClineEndpoint.parseEndpointsExtension(obj, filePath)
		const standardFields = ["appBaseUrl", "apiBaseUrl", "mcpBaseUrl"] as const
		const hasRequiredFields = standardFields.every((field) => typeof obj[field] === "string" && String(obj[field]).trim())
		const hasAnyStandardField = standardFields.some((field) => typeof obj[field] === "string" && String(obj[field]).trim())

		if (hasRequiredFields) {
			return {
				config: ClineEndpoint.validateEndpointsSchema(data, filePath),
				extension,
			}
		}

		if (ClineEndpoint.isAxlineExtensionOnlyConfig(extension)) {
			return { config: null, extension }
		}

		if (hasAnyStandardField || Object.keys(obj).length === 0) {
			return {
				config: ClineEndpoint.validateEndpointsSchema(data, filePath),
				extension,
			}
		}

		throw new ClineConfigurationError(
			`Endpoints configuration file (${filePath}) must include appBaseUrl/apiBaseUrl/mcpBaseUrl, axgateBaseUrl, or authNexusBaseUrl`,
		)
	}

	private static isAxlineExtensionOnlyConfig(extension: AxlineEndpointsExtension | null): boolean {
		if (!extension) {
			return false
		}
		return Boolean(
			extension.axgateBaseUrl?.trim() ||
				extension.authNexusBaseUrl?.trim() ||
				extension.updateAppId?.trim() ||
				extension.updateEnrollmentCode?.trim(),
		)
	}

	/**
	 * Validate AxGate / AuthNexus URLs: HTTPS required (HTTP only for localhost).
	 * Also rewrites known retired HTTP bases to the current HTTPS defaults.
	 */
	private static parseSecureEndpointUrl(field: string, value: unknown, filePath: string): string {
		if (typeof value !== "string" || !value.trim()) {
			throw new ClineConfigurationError(
				`Field "${field}" in endpoints configuration file (${filePath}) must be a non-empty string URL`,
			)
		}
		const migrated = migrateEndpointUrl(value)
		try {
			new URL(migrated)
		} catch {
			throw new ClineConfigurationError(
				`Field "${field}" in endpoints configuration file (${filePath}) must be a valid URL. Got: "${value}"`,
			)
		}
		if (!isSecureEndpointUrl(migrated)) {
			throw new ClineConfigurationError(
				`Field "${field}" in endpoints configuration file (${filePath}) must use HTTPS (plain HTTP is only allowed for localhost). Got: "${value}"`,
			)
		}
		return migrated
	}

	private static parseEndpointsExtension(obj: Record<string, unknown>, filePath: string): AxlineEndpointsExtension | null {
		const axgateBaseUrl = obj.axgateBaseUrl
		const authAppId = obj.authAppId
		const authNexusBaseUrl = obj.authNexusBaseUrl
		const updateAppId = obj.updateAppId
		const updateEnrollmentCode = obj.updateEnrollmentCode

		if (
			axgateBaseUrl === undefined &&
			authAppId === undefined &&
			authNexusBaseUrl === undefined &&
			updateAppId === undefined &&
			updateEnrollmentCode === undefined
		) {
			return null
		}

		const result: AxlineEndpointsExtension = {}
		if (axgateBaseUrl !== undefined) {
			result.axgateBaseUrl = ClineEndpoint.parseSecureEndpointUrl("axgateBaseUrl", axgateBaseUrl, filePath)
		}

		if (authAppId !== undefined) {
			if (typeof authAppId !== "string" || !authAppId.trim()) {
				throw new ClineConfigurationError(
					`Field "authAppId" in endpoints configuration file (${filePath}) must be a non-empty string`,
				)
			}
			result.authAppId = authAppId
		}

		if (authNexusBaseUrl !== undefined) {
			result.authNexusBaseUrl = ClineEndpoint.parseSecureEndpointUrl("authNexusBaseUrl", authNexusBaseUrl, filePath)
		}

		if (updateAppId !== undefined) {
			if (typeof updateAppId !== "string" || !updateAppId.trim()) {
				throw new ClineConfigurationError(
					`Field "updateAppId" in endpoints configuration file (${filePath}) must be a non-empty string`,
				)
			}
			result.updateAppId = updateAppId
		}

		if (updateEnrollmentCode !== undefined) {
			if (typeof updateEnrollmentCode !== "string" || !updateEnrollmentCode.trim()) {
				throw new ClineConfigurationError(
					`Field "updateEnrollmentCode" in endpoints configuration file (${filePath}) must be a non-empty string`,
				)
			}
			result.updateEnrollmentCode = updateEnrollmentCode
		}

		return result
	}

	public static getAxgateConfig(): AxlineEndpointsExtension | null {
		if (!ClineEndpoint._initialized || !ClineEndpoint._instance) {
			return null
		}
		return ClineEndpoint._instance.endpointsExtension
	}

	public static getEndpointsExtension(): AxlineEndpointsExtension | null {
		return ClineEndpoint.getAxgateConfig()
	}

	public static getUserSecrets(): AxlineSecrets | null {
		if (!ClineEndpoint._initialized || !ClineEndpoint._instance) {
			return null
		}
		return ClineEndpoint._instance.userSecrets
	}

	/**
	 * Validates that the provided data matches the EndpointsFileSchema.
	 * All fields must be present and be valid URLs.
	 *
	 * @param data The parsed JSON data to validate
	 * @param filePath The path to the file (for error messages)
	 * @returns The validated EndpointsFileSchema
	 * @throws ClineConfigurationError if validation fails
	 */
	private static validateEndpointsSchema(data: unknown, filePath: string): EndpointsFileSchema {
		if (typeof data !== "object" || data === null) {
			throw new ClineConfigurationError(`Endpoints configuration file (${filePath}) must contain a JSON object`)
		}

		const obj = data as Record<string, unknown>
		const requiredFields = ["appBaseUrl", "apiBaseUrl", "mcpBaseUrl"] as const
		const result: Partial<EndpointsFileSchema> = {}

		for (const field of requiredFields) {
			const value = obj[field]

			if (value === undefined || value === null) {
				throw new ClineConfigurationError(
					`Missing required field "${field}" in endpoints configuration file (${filePath})`,
				)
			}

			if (typeof value !== "string") {
				throw new ClineConfigurationError(
					`Field "${field}" in endpoints configuration file (${filePath}) must be a string`,
				)
			}

			if (!value.trim()) {
				throw new ClineConfigurationError(
					`Field "${field}" in endpoints configuration file (${filePath}) cannot be empty`,
				)
			}

			// Validate URL format
			try {
				new URL(value)
			} catch {
				throw new ClineConfigurationError(
					`Field "${field}" in endpoints configuration file (${filePath}) must be a valid URL. Got: "${value}"`,
				)
			}

			result[field] = value
		}

		return result as EndpointsFileSchema
	}

	/**
	 * Returns the current environment configuration.
	 */
	public config(): EnvironmentConfig {
		return this.getEnvironment()
	}

	/**
	 * Sets the current environment.
	 * @throws Error if in on-premise mode (environment switching is disabled)
	 */
	public setEnvironment(env: string) {
		if (this.onPremiseConfig) {
			throw new Error("Cannot change environment in on-premise mode. Endpoints are configured via ~/.axline/endpoints.json")
		}

		switch (env.toLowerCase()) {
			case "staging":
				this.environment = Environment.staging
				break
			case "local":
				this.environment = Environment.local
				break
			default:
				this.environment = Environment.production
				break
		}
	}

	/**
	 * Returns the current environment configuration.
	 * If running in on-premise mode, returns the custom endpoints.
	 */
	public getEnvironment(): EnvironmentConfig {
		// On-premise mode: use custom endpoints from file
		if (this.onPremiseConfig) {
			return {
				environment: Environment.selfHosted,
				appBaseUrl: this.onPremiseConfig.appBaseUrl,
				apiBaseUrl: this.onPremiseConfig.apiBaseUrl,
				mcpBaseUrl: this.onPremiseConfig.mcpBaseUrl,
			}
		}

		// Standard mode: use built-in environment URLs
		switch (this.environment) {
			case Environment.staging:
				return {
					environment: Environment.staging,
					appBaseUrl: "https://staging-app.cline.bot",
					apiBaseUrl: "https://core-api.staging.int.cline.bot",
					mcpBaseUrl: "https://core-api.staging.int.cline.bot/v1/mcp",
				}
			case Environment.local:
				return {
					environment: Environment.local,
					appBaseUrl: "http://localhost:3000",
					apiBaseUrl: "http://localhost:7777",
					mcpBaseUrl: "https://api.cline.bot/v1/mcp",
				}
			default:
				return {
					environment: Environment.production,
					appBaseUrl: "https://app.cline.bot",
					apiBaseUrl: "https://api.cline.bot",
					mcpBaseUrl: "https://api.cline.bot/v1/mcp",
				}
		}
	}
}

/**
 * Singleton instance to access the current environment configuration.
 * Usage:
 * - ClineEnv.config() to get the current config.
 * - ClineEnv.setEnvironment(Environment.local) to change the environment.
 *
 * IMPORTANT: ClineEndpoint.initialize() must be called before using ClineEnv.
 */
export const ClineEnv = {
	config: () => ClineEndpoint.config,
	setEnvironment: (env: string) => ClineEndpoint.instance.setEnvironment(env),
	getEnvironment: () => ClineEndpoint.instance.getEnvironment(),
}

// Export the class for initialization
export { ClineEndpoint }
