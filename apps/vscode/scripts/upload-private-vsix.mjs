#!/usr/bin/env bun
/**
 * Upload a built Axline VSIX to AuthNexus (STABLE track).
 *
 * Requires AuthNexus console admin credentials (enrollment code is client-only).
 *
 * Usage:
 *   # Reads ~/.axline/secrets.json (authNexusAdminUser/Password) or env vars
 *   bun apps/vscode/scripts/upload-private-vsix.mjs
 *
 * Env overrides (take precedence over secrets.json):
 *   AXLINE_AUTHNEXUS_BASE_URL, AXLINE_UPDATE_APP_ID
 *   AUTHNEXUS_ADMIN_USER / AUTHNEXUS_ADMIN_PASS (or AUTHNEXUS_EMAIL / AUTHNEXUS_PASSWORD)
 *   AUTHNEXUS_CONSOLE_APP_ID (default: authnexus-console)
 *   AXLINE_VSIX_PATH, AXLINE_RELEASE_CHANGELOG
 *
 * Notes:
 *   - Login sends username + password + appId (not email-only).
 *   - Upload sends file + version/track/changelog only; server computes fileHash.
 *   - Auto-promotes PENDING releases to PUBLISHED.
 *   - Do NOT package endpoints.json into the VSIX.
 */

import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { loadAxlineConfig } from "./lib/load-axline-config.mjs"
import { assertValidVsixLayout } from "./lib/vsix-zip.mjs"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const VSCODE_DIR = resolve(__dirname, "..")
const PACKAGE_JSON = join(VSCODE_DIR, "package.json")
const DEFAULT_BASE_VSIX = join(VSCODE_DIR, "dist", "axline.vsix")
const DEFAULT_ENTERPRISE_VSIX = join(VSCODE_DIR, "dist", "axline-enterprise.vsix")

function resolveVsixPath() {
	const override = process.env.AXLINE_VSIX_PATH?.trim()
	if (override) {
		return override
	}
	if (existsSync(DEFAULT_ENTERPRISE_VSIX)) {
		return DEFAULT_ENTERPRISE_VSIX
	}
	return DEFAULT_BASE_VSIX
}
const TIMEOUT_MS = 120_000

function ensureBunOnPath() {
	const bunHome = join(homedir(), ".bun", "bin")
	if (!process.env.PATH?.includes(bunHome)) {
		process.env.PATH = `${bunHome}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`
	}
}

async function loadConfig() {
	const config = await loadAxlineConfig(VSCODE_DIR)
	const authNexusBaseUrl = config.authNexusBaseUrl
	const updateAppId = config.updateAppId
	const username = config.authNexusAdminUser
	const password = config.authNexusAdminPassword
	const consoleAppId = process.env.AUTHNEXUS_CONSOLE_APP_ID?.trim() || "authnexus-console"

	const missing = []
	if (!authNexusBaseUrl) missing.push("authNexusBaseUrl")
	if (!updateAppId) missing.push("updateAppId")
	if (!username) {
		missing.push("authNexusAdminUser in ~/.axline/secrets.json or AUTHNEXUS_ADMIN_USER / AUTHNEXUS_EMAIL")
	}
	if (!password) {
		missing.push("authNexusAdminPassword in ~/.axline/secrets.json or AUTHNEXUS_ADMIN_PASS / AUTHNEXUS_PASSWORD")
	}

	if (missing.length > 0) {
		console.error("Missing upload configuration:")
		for (const field of missing) {
			console.error(`  - ${field}`)
		}
		console.error("\nConfigure once on this machine (~/.axline/secrets.json, gitignored):")
		console.error('  { "authNexusAdminUser": "admin", "authNexusAdminPassword": "<console-password>" }')
		console.error("\nOr pass env vars for this shell only:")
		console.error("  AUTHNEXUS_ADMIN_USER=admin AUTHNEXUS_ADMIN_PASS=secret bun apps/vscode/scripts/upload-private-vsix.mjs")
		process.exit(1)
	}

	return { authNexusBaseUrl, updateAppId, username, password, consoleAppId }
}

async function parseError(response) {
	try {
		const body = await response.json()
		return body.message || JSON.stringify(body)
	} catch {
		return `${response.status} ${response.statusText}`
	}
}

async function loginUser(config) {
	const response = await fetch(`${config.authNexusBaseUrl}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			username: config.username,
			password: config.password,
			appId: config.consoleAppId,
		}),
		signal: AbortSignal.timeout(TIMEOUT_MS),
	})

	if (!response.ok) {
		throw new Error(`AuthNexus login failed: ${await parseError(response)}`)
	}

	const body = await response.json()
	const token = body.access_token?.trim() || body.accessToken?.trim()
	if (!token) {
		throw new Error("AuthNexus login succeeded but no access token was returned")
	}
	return token
}

async function uploadRelease(config, token, input) {
	const form = new FormData()
	form.append("file", new Blob([input.vsixBytes], { type: "application/octet-stream" }), "axline.vsix")
	form.append("version", input.version)
	form.append("track", "STABLE")
	form.append("changelog", input.changelog)
	form.append("isMandatory", "false")

	const url = `${config.authNexusBaseUrl}/api/software/${encodeURIComponent(config.updateAppId)}/releases`
	const response = await fetch(url, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: form,
		signal: AbortSignal.timeout(TIMEOUT_MS),
	})

	if (!response.ok) {
		throw new Error(`AuthNexus release upload failed: ${await parseError(response)}`)
	}

	return response.json()
}

async function publishRelease(config, token, releaseId) {
	const url = `${config.authNexusBaseUrl}/api/software/releases/${encodeURIComponent(releaseId)}/status`
	const response = await fetch(url, {
		method: "PATCH",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ status: "PUBLISHED" }),
		signal: AbortSignal.timeout(TIMEOUT_MS),
	})

	if (!response.ok) {
		throw new Error(`AuthNexus release publish failed: ${await parseError(response)}`)
	}

	return response.json()
}

async function main() {
	ensureBunOnPath()
	const config = await loadConfig()
	const vsixPath = resolveVsixPath()
	if (!existsSync(vsixPath)) {
		console.error(`VSIX not found: ${vsixPath}`)
		console.error("Run: bun apps/vscode/scripts/release-private-vsix.mjs --skip-upload")
		process.exit(1)
	}

	const pkg = JSON.parse(await readFile(PACKAGE_JSON, "utf8"))
	const version = pkg.version?.trim()
	if (!version) {
		throw new Error("package.json version is missing")
	}

	const vsixBytes = await readFile(vsixPath)
	await assertValidVsixLayout(vsixPath)
	const fileHash = createHash("sha256").update(vsixBytes).digest("hex")
	const fileSize = vsixBytes.byteLength
	const changelog =
		process.env.AXLINE_RELEASE_CHANGELOG?.trim() || `Axline ${version} — stable Installation ID per hardware device`

	console.log("AuthNexus VSIX upload")
	console.log(`  AuthNexus: ${config.authNexusBaseUrl}`)
	console.log(`  App ID:    ${config.updateAppId}`)
	console.log(`  Version:   ${version}`)
	console.log(`  VSIX:      ${vsixPath}`)
	console.log(`  fileSize:  ${fileSize}`)
	console.log(`  fileHash:  ${fileHash}`)
	console.log("")

	const token = await loginUser(config)
	console.log("  Login:     OK")

	const release = await uploadRelease(config, token, {
		version,
		vsixBytes,
		fileHash,
		fileSize,
		changelog,
	})

	console.log("  Upload:    OK")
	console.log(`    releaseId:   ${release.id ?? "(unknown)"}`)
	console.log(`    downloadUrl: ${release.downloadUrl ?? "(pending)"}`)

	if (release.status !== "PUBLISHED" && release.id) {
		const published = await publishRelease(config, token, release.id)
		console.log("  Publish:   OK")
		console.log(`    status:      ${published.status ?? "PUBLISHED"}`)
	}
	console.log("")
	console.log("Next: bun apps/vscode/scripts/verify-private-update.mjs")
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})
