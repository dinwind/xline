import * as fs from "node:fs"
import * as fsPromises from "node:fs/promises"
import * as os from "os"
import * as path from "path"

const AXLINE_DIR_NAME = ".axline"
const LEGACY_CLINE_DIR_NAME = ".cline"
const DATA_SUBFOLDER = "data"
export const AXLINE_ENDPOINTS_FILE_NAME = "endpoints.json"
export const AXLINE_MCP_SETTINGS_FILE_NAME = "axline_mcp_settings.json"
export const LEGACY_CLINE_MCP_SETTINGS_FILE_NAME = "cline_mcp_settings.json"

/** Default public endpoints for fresh Axline installs (no secrets). HTTPS only. */
export const DEFAULT_AXLINE_ENDPOINTS = {
	axgateBaseUrl: "https://auth.mtsilicon.com:6343",
	authAppId: "app_uu1Sn7yC",
	/** AuthNexus production HTTPS on standard port 443 (no :port in URL). */
	authNexusBaseUrl: "https://auth.mtsilicon.com",
	updateAppId: "app_uu1Sn7yC",
} as const

/**
 * Retired insecure / old-port bases → current HTTPS bases.
 * Applied on load so existing ~/.axline/endpoints.json keeps working after the cutover.
 */
export const AXLINE_ENDPOINT_URL_MIGRATIONS: Readonly<Record<string, string>> = {
	"http://auth.mtsilicon.com:6100": DEFAULT_AXLINE_ENDPOINTS.axgateBaseUrl,
	"https://auth.mtsilicon.com:6100": DEFAULT_AXLINE_ENDPOINTS.axgateBaseUrl,
	"http://auth.mtsilicon.com:6343": DEFAULT_AXLINE_ENDPOINTS.axgateBaseUrl,
	"http://auth.mtsilicon.com:3000": DEFAULT_AXLINE_ENDPOINTS.authNexusBaseUrl,
	"https://auth.mtsilicon.com:3000": DEFAULT_AXLINE_ENDPOINTS.authNexusBaseUrl,
	"http://auth.mtsilicon.com:3443": DEFAULT_AXLINE_ENDPOINTS.authNexusBaseUrl,
	"https://auth.mtsilicon.com:3443": DEFAULT_AXLINE_ENDPOINTS.authNexusBaseUrl,
	"https://auth.mtsilicon.com:443": DEFAULT_AXLINE_ENDPOINTS.authNexusBaseUrl,
}

/** Rewrite a single known retired endpoint URL; leave others unchanged. */
export function migrateEndpointUrl(url: string): string {
	const trimmed = url.trim().replace(/\/$/, "")
	return AXLINE_ENDPOINT_URL_MIGRATIONS[trimmed] ?? url.trim()
}

/**
 * True when the URL is acceptable for AxGate / AuthNexus:
 * HTTPS anywhere, or HTTP only for localhost / 127.0.0.1.
 */
export function isSecureEndpointUrl(url: string): boolean {
	try {
		const parsed = new URL(url.trim())
		if (parsed.protocol === "https:") {
			return true
		}
		if (parsed.protocol === "http:") {
			return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"
		}
		return false
	} catch {
		return false
	}
}

/**
 * Rewrite known insecure AuthNexus / AxGate URLs in an endpoints.json object.
 * Returns whether any field changed.
 */
export function migrateEndpointsObject(data: Record<string, unknown>): boolean {
	let changed = false
	for (const key of ["axgateBaseUrl", "authNexusBaseUrl"] as const) {
		const value = data[key]
		if (typeof value !== "string" || !value.trim()) {
			continue
		}
		const next = migrateEndpointUrl(value)
		if (next !== value) {
			data[key] = next
			changed = true
		}
	}
	return changed
}

/** Migrate on-disk user endpoints.json files that still point at retired HTTP bases. */
export async function migrateInsecureUserEndpointsFiles(): Promise<void> {
	for (const filePath of resolveUserEndpointsCandidates()) {
		try {
			await fsPromises.access(filePath)
		} catch {
			continue
		}
		try {
			const raw = await fsPromises.readFile(filePath, "utf8")
			const data = JSON.parse(raw) as Record<string, unknown>
			if (!migrateEndpointsObject(data)) {
				continue
			}
			await fsPromises.writeFile(filePath, `${JSON.stringify(data, null, "\t")}\n`, "utf8")
		} catch {
			// leave file alone if unreadable / invalid; load path will report errors
		}
	}
}

/**
 * Axline user home directory.
 * Override with AXLINE_DIR (preferred) or legacy CLINE_DIR only when AXLINE_DIR is unset.
 */
export function resolveAxlineHomeDir(): string {
	const fromAxlineEnv = process.env.AXLINE_DIR?.trim()
	if (fromAxlineEnv) {
		return fromAxlineEnv
	}
	return path.join(os.homedir(), AXLINE_DIR_NAME)
}

/** Legacy Cline home used for backward-compatible config fallbacks. */
export function resolveLegacyClineHomeDir(): string {
	const fromClineEnv = process.env.CLINE_DIR?.trim()
	if (fromClineEnv) {
		return fromClineEnv
	}
	return path.join(os.homedir(), LEGACY_CLINE_DIR_NAME)
}

/**
 * Canonical Axline data directory (~/.axline/data).
 * Explicit CLINE_DATA_DIR still wins for tests and advanced overrides.
 */
export function resolveAxlineDataDir(): string {
	const explicitDataDir = process.env.CLINE_DATA_DIR?.trim()
	if (explicitDataDir) {
		return explicitDataDir
	}
	return path.join(resolveStorageHomeDir(), DATA_SUBFOLDER)
}

/** Legacy data directory (~/.cline/data). */
export function resolveLegacyClineDataDir(): string {
	return path.join(resolveLegacyClineHomeDir(), DATA_SUBFOLDER)
}

/**
 * Home directory used for persistent Axline storage (state, settings, skills).
 * Priority: explicit option/env AXLINE_DIR → AXLINE_DIR default → legacy CLINE_DIR.
 */
export function resolveStorageHomeDir(overrideHomeDir?: string): string {
	if (overrideHomeDir?.trim()) {
		return overrideHomeDir.trim()
	}
	const axlineDir = process.env.AXLINE_DIR?.trim()
	if (axlineDir) {
		return axlineDir
	}
	const legacyDir = process.env.CLINE_DIR?.trim()
	if (legacyDir) {
		return legacyDir
	}
	return resolveAxlineHomeDir()
}

/**
 * Resolve an existing data directory for reads.
 * Prefer ~/.axline/data; fall back to legacy ~/.cline/data only on the default home layout.
 */
export function resolveExistingDataDir(): string {
	const axlineData = resolveAxlineDataDir()
	if (fs.existsSync(axlineData)) {
		return axlineData
	}

	const usingDefaultHome =
		!process.env.AXLINE_DIR?.trim() && !process.env.CLINE_DIR?.trim() && !process.env.CLINE_DATA_DIR?.trim()
	if (usingDefaultHome) {
		const legacyData = resolveLegacyClineDataDir()
		if (fs.existsSync(legacyData)) {
			return legacyData
		}
	}

	return axlineData
}

/**
 * One-time migration: copy legacy ~/.cline/data to ~/.axline/data when axline data is missing.
 * No-op when axline data already exists or legacy data is absent.
 */
export function migrateLegacyClineDataDirIfNeeded(): void {
	const axlineData = resolveAxlineDataDir()
	if (fs.existsSync(axlineData)) {
		return
	}
	const legacyData = resolveLegacyClineDataDir()
	if (!fs.existsSync(legacyData)) {
		return
	}
	fs.mkdirSync(path.dirname(axlineData), { recursive: true })
	fs.cpSync(legacyData, axlineData, { recursive: true })
}

/** User endpoints.json candidates: ~/.axline first, then legacy ~/.cline. */
export function resolveUserEndpointsCandidates(): string[] {
	const axlinePath = path.join(resolveAxlineHomeDir(), AXLINE_ENDPOINTS_FILE_NAME)
	const legacyPath = path.join(resolveLegacyClineHomeDir(), AXLINE_ENDPOINTS_FILE_NAME)
	return legacyPath === axlinePath ? [axlinePath] : [axlinePath, legacyPath]
}

/**
 * Ensures ~/.axline/endpoints.json exists on first run.
 * Priority: keep existing → copy legacy ~/.cline/endpoints.json → copy bundled VSIX (public fields) → defaults.
 */
export async function ensureAxlineEndpointsFile(extensionFsPath?: string): Promise<void> {
	const axlineHome = resolveAxlineHomeDir()
	const axlineEndpoints = path.join(axlineHome, AXLINE_ENDPOINTS_FILE_NAME)

	try {
		await fsPromises.access(axlineEndpoints)
		return
	} catch {
		// create below
	}

	await fsPromises.mkdir(axlineHome, { recursive: true })

	const legacyEndpoints = path.join(resolveLegacyClineHomeDir(), AXLINE_ENDPOINTS_FILE_NAME)
	try {
		await fsPromises.access(legacyEndpoints)
		await fsPromises.copyFile(legacyEndpoints, axlineEndpoints)
		return
	} catch {
		// try bundled or defaults
	}

	if (extensionFsPath?.trim()) {
		const bundledEndpoints = path.join(extensionFsPath.trim(), AXLINE_ENDPOINTS_FILE_NAME)
		try {
			await fsPromises.access(bundledEndpoints)
			const raw = await fsPromises.readFile(bundledEndpoints, "utf8")
			const data = JSON.parse(raw) as Record<string, unknown>
			delete data.updateEnrollmentCode
			await fsPromises.writeFile(axlineEndpoints, `${JSON.stringify(data, null, "\t")}\n`, "utf8")
			return
		} catch {
			// fall through to defaults
		}
	}

	await fsPromises.writeFile(axlineEndpoints, `${JSON.stringify(DEFAULT_AXLINE_ENDPOINTS, null, "\t")}\n`, "utf8")
}

/** User secrets.json candidates: ~/.axline first, then legacy ~/.cline. */
export function resolveUserSecretsCandidates(): string[] {
	const axlinePath = path.join(resolveAxlineHomeDir(), "secrets.json")
	const legacyPath = path.join(resolveLegacyClineHomeDir(), "secrets.json")
	return legacyPath === axlinePath ? [axlinePath] : [axlinePath, legacyPath]
}

/** Directory for AuthNexus update token cache. */
export function resolveAxlineUpdateDir(): string {
	return path.join(resolveAxlineHomeDir(), "update")
}
