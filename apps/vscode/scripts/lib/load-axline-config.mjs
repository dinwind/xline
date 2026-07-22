/**
 * Shared config loader for Axline publish/verify scripts.
 *
 * Priority:
 *   endpoints — apps/vscode/endpoints.json → ~/.axline/endpoints.json → ~/.cline/endpoints.json
 *   secrets   — ~/.axline/secrets.json → ~/.cline/secrets.json → apps/vscode/secrets.json
 *               (updateEnrollmentCode, authNexusAdminUser, authNexusAdminPassword)
 *   enrollment — env → secrets.json → endpoints.json (legacy)
 *   admin upload — env → secrets.json (authNexusAdminUser/Password)
 */

import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

function resolveAxlineHome() {
	return process.env.AXLINE_DIR?.trim() || join(homedir(), ".axline")
}

function resolveLegacyClineHome() {
	return process.env.CLINE_DIR?.trim() || join(homedir(), ".cline")
}

async function readJsonIfExists(filePath) {
	try {
		let raw = await readFile(filePath, "utf8")
		if (raw.charCodeAt(0) === 0xfeff) {
			raw = raw.slice(1)
		}
		return JSON.parse(raw)
	} catch {
		return null
	}
}

async function loadFirstExisting(paths) {
	for (const filePath of paths) {
		if (existsSync(filePath)) {
			const data = await readJsonIfExists(filePath)
			if (data) {
				return { data, path: filePath }
			}
		}
	}
	return { data: {}, path: null }
}

/** Retired insecure / old-port bases → current HTTPS defaults. */
const AUTHNEXUS_HTTPS = "https://auth.mtsilicon.com"
const ENDPOINT_URL_MIGRATIONS = {
	"http://auth.mtsilicon.com:6100": "https://auth.mtsilicon.com:6343",
	"https://auth.mtsilicon.com:6100": "https://auth.mtsilicon.com:6343",
	"http://auth.mtsilicon.com:6343": "https://auth.mtsilicon.com:6343",
	"http://auth.mtsilicon.com:3000": AUTHNEXUS_HTTPS,
	"https://auth.mtsilicon.com:3000": AUTHNEXUS_HTTPS,
	"http://auth.mtsilicon.com:3443": AUTHNEXUS_HTTPS,
	"https://auth.mtsilicon.com:3443": AUTHNEXUS_HTTPS,
	"https://auth.mtsilicon.com:443": AUTHNEXUS_HTTPS,
}

function migrateEndpointUrl(url) {
	const trimmed = url.trim().replace(/\/$/, "")
	return ENDPOINT_URL_MIGRATIONS[trimmed] || trimmed
}

function assertSecureEndpointUrl(field, url) {
	if (!url) {
		return url
	}
	let parsed
	try {
		parsed = new URL(url)
	} catch {
		throw new Error(`${field} must be a valid URL. Got: "${url}"`)
	}
	if (parsed.protocol === "https:") {
		return url
	}
	if (parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
		return url
	}
	throw new Error(`${field} must use HTTPS (plain HTTP is only allowed for localhost). Got: "${url}"`)
}

export async function loadAxlineConfig(vscodeDir) {
	const axlineHome = resolveAxlineHome()
	const legacyHome = resolveLegacyClineHome()

	const endpointsResult = await loadFirstExisting([
		join(vscodeDir, "endpoints.json"),
		join(axlineHome, "endpoints.json"),
		join(legacyHome, "endpoints.json"),
	])

	const secretsResult = await loadFirstExisting([
		join(axlineHome, "secrets.json"),
		join(legacyHome, "secrets.json"),
		join(vscodeDir, "secrets.json"),
	])

	const endpoints = endpointsResult.data
	const secrets = secretsResult.data

	const updateEnrollmentCode =
		process.env.AXLINE_UPDATE_ENROLLMENT_CODE?.trim() ||
		secrets.updateEnrollmentCode?.trim() ||
		endpoints.updateEnrollmentCode?.trim() ||
		""

	const authNexusAdminUser =
		process.env.AUTHNEXUS_ADMIN_USER?.trim() ||
		process.env.AUTHNEXUS_EMAIL?.trim() ||
		process.env.AXLINE_AUTHNEXUS_EMAIL?.trim() ||
		secrets.authNexusAdminUser?.trim() ||
		""

	const authNexusAdminPassword =
		process.env.AUTHNEXUS_ADMIN_PASS?.trim() ||
		process.env.AUTHNEXUS_PASSWORD?.trim() ||
		process.env.AXLINE_AUTHNEXUS_PASSWORD?.trim() ||
		secrets.authNexusAdminPassword?.trim() ||
		""

	const authNexusBaseUrl = assertSecureEndpointUrl(
		"authNexusBaseUrl",
		migrateEndpointUrl(process.env.AXLINE_AUTHNEXUS_BASE_URL?.trim() || endpoints.authNexusBaseUrl?.trim() || ""),
	)
	const axgateBaseUrl = assertSecureEndpointUrl(
		"axgateBaseUrl",
		migrateEndpointUrl(
			process.env.AXLINE_AXGATE_BASE_URL?.trim() ||
				process.env.AXGATE_BASE_URL?.trim() ||
				endpoints.axgateBaseUrl?.trim() ||
				"",
		),
	)

	return {
		endpoints,
		secrets,
		endpointsPath: endpointsResult.path,
		secretsPath: secretsResult.path,
		authNexusBaseUrl,
		updateAppId: process.env.AXLINE_UPDATE_APP_ID?.trim() || endpoints.updateAppId?.trim() || "",
		updateEnrollmentCode,
		authNexusAdminUser,
		authNexusAdminPassword,
		axgateBaseUrl,
	}
}
