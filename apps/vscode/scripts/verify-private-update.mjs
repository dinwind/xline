#!/usr/bin/env bun

/**

 * Verify AuthNexus private-update configuration for Axline.

 *

 * Reads ~/.axline/endpoints.json + ~/.axline/secrets.json (with legacy ~/.cline fallbacks)

 * or apps/vscode local files for dev scripts.

 *

 * Usage:

 *   bun apps/vscode/scripts/verify-private-update.mjs

 *   AXLINE_UPDATE_ENROLLMENT_CODE=... bun apps/vscode/scripts/verify-private-update.mjs

 */

import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import { join, resolve } from "node:path"

import { fileURLToPath } from "node:url"

import { loadAxlineConfig } from "./lib/load-axline-config.mjs"
import { assertValidVsixLayout } from "./lib/vsix-zip.mjs"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

const VSCODE_DIR = resolve(__dirname, "..")

async function loadConfig() {
	const config = await loadAxlineConfig(VSCODE_DIR)

	const { authNexusBaseUrl, updateAppId, updateEnrollmentCode } = config

	const missing = []

	if (!authNexusBaseUrl) missing.push("authNexusBaseUrl / AXLINE_AUTHNEXUS_BASE_URL")

	if (!updateAppId) missing.push("updateAppId / AXLINE_UPDATE_APP_ID")

	if (!updateEnrollmentCode) missing.push("updateEnrollmentCode / ~/.axline/secrets.json / AXLINE_UPDATE_ENROLLMENT_CODE")

	if (missing.length > 0) {
		console.error("Missing private-update configuration:")

		for (const field of missing) {
			console.error(`  - ${field}`)
		}

		console.error("\nPublic fields: copy endpoints.example.json → ~/.axline/endpoints.json")

		console.error("Secret: copy secrets.example.json → ~/.axline/secrets.json")

		process.exit(1)
	}

	return { authNexusBaseUrl, updateAppId, updateEnrollmentCode }
}

async function parseError(response) {
	try {
		const body = await response.json()

		return body.message || `${response.status} ${response.statusText}`
	} catch {
		return `${response.status} ${response.statusText}`
	}
}

async function main() {
	const config = await loadConfig()

	console.log("Axline private-update verification")

	console.log(`  AuthNexus: ${config.authNexusBaseUrl}`)

	console.log(`  App ID:    ${config.updateAppId}`)

	const enrollRes = await fetch(`${config.authNexusBaseUrl}/api/auth/app/enroll`, {
		method: "POST",

		headers: { "Content-Type": "application/json" },

		body: JSON.stringify({ appId: config.updateAppId, code: config.updateEnrollmentCode }),

		signal: AbortSignal.timeout(30_000),
	})

	if (!enrollRes.ok) {
		console.error(`Enroll failed: ${await parseError(enrollRes)}`)

		process.exit(1)
	}

	const enrollBody = await enrollRes.json()

	const token = enrollBody.access_token?.trim() || enrollBody.accessToken?.trim()

	if (!token) {
		console.error("Enroll succeeded but no access token in response")

		process.exit(1)
	}

	console.log("  Enroll:    OK")

	const latestUrl = `${config.authNexusBaseUrl}/api/software/${encodeURIComponent(config.updateAppId)}/latest`

	const latestRes = await fetch(latestUrl, {
		headers: { Authorization: `Bearer ${token}` },

		signal: AbortSignal.timeout(30_000),
	})

	if (!latestRes.ok) {
		console.error(`Latest release check failed: ${await parseError(latestRes)}`)

		process.exit(1)
	}

	const latest = await latestRes.json()

	if (!latest.version || !latest.downloadUrl) {
		console.error("Latest release response missing version or downloadUrl")

		process.exit(1)
	}

	console.log("  Latest:    OK")

	console.log(`    version:     ${latest.version}`)

	console.log(`    downloadUrl: ${latest.downloadUrl}`)

	if (latest.fileHash) {
		console.log(`    fileHash:    ${latest.fileHash}`)
	}

	console.log("  Download:  checking artifact…")

	const downloadRes = await fetch(latest.downloadUrl, { signal: AbortSignal.timeout(120_000) })

	if (!downloadRes.ok) {
		console.error(`Download failed: ${downloadRes.status} ${downloadRes.statusText}`)

		process.exit(1)
	}

	const tempPath = join(VSCODE_DIR, ".tmp-verify-update.vsix")

	const bytes = Buffer.from(await downloadRes.arrayBuffer())

	await fs.writeFile(tempPath, bytes)

	try {
		await assertValidVsixLayout(tempPath)

		console.log("  Download:  OK (valid VSIX layout)")

		if (latest.fileHash) {
			const actual = createHash("sha256").update(bytes).digest("hex")

			if (actual !== latest.fileHash.trim().toLowerCase()) {
				console.error("Downloaded file failed SHA-256 integrity check")

				process.exit(1)
			}

			console.log("  Integrity: OK (SHA-256 matches)")
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error))

		process.exit(1)
	} finally {
		await fs.rm(tempPath, { force: true })
	}

	console.log("\nPrivate update chain is ready for Axline extension.")
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error))

	process.exit(1)
})
