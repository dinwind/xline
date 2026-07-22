#!/usr/bin/env node
/**
 * Verify Axline ↔ AxGate installation identity contract against a live AxGate deployment.
 *
 * Flow:
 *   1. GET  /healthz
 *   2. POST /api/auth/login            (+ client identity headers)
 *   3. POST /api/devices/enroll        (+ JWT, no device token yet)
 *   4. GET  /api/devices/me            (+ JWT + device token)
 *   5. GET  /api/session/me            (+ full headers)
 *   6. GET  /v1/models                 (+ full headers)
 *
 * Usage:
 *   node apps/vscode/scripts/verify-axgate-device-identity.mjs
 *   AXLINE_AXGATE_USERNAME=test1 AXLINE_AXGATE_PASSWORD=... node apps/vscode/scripts/verify-axgate-device-identity.mjs
 *
 * Optional:
 *   AXLINE_AXGATE_BASE_URL=https://auth.mtsilicon.com:6343
 *   AXLINE_AUTH_APP_ID=app_uu1Sn7yC
 */

import { randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const VSCODE_DIR = resolve(__dirname, "..")
const ENDPOINTS_PATH = join(VSCODE_DIR, "endpoints.json")
const CLIENT_NAME = "axline-vscode"
const CLIENT_VERSION = process.env.AXLINE_CLIENT_VERSION?.trim() || "0.2.0"
const TIMEOUT_MS = 30_000

async function loadConfig() {
	let file = {}
	try {
		file = JSON.parse(await readFile(ENDPOINTS_PATH, "utf8"))
	} catch {
		// optional
	}

	const baseUrl = (process.env.AXLINE_AXGATE_BASE_URL?.trim() || file.axgateBaseUrl?.trim() || "").replace(/\/$/, "")
	const appId = process.env.AXLINE_AUTH_APP_ID?.trim() || file.authAppId?.trim() || ""
	const username = process.env.AXLINE_AXGATE_USERNAME?.trim() || ""
	const password = process.env.AXLINE_AXGATE_PASSWORD?.trim() || ""

	const missing = []
	if (!baseUrl) missing.push("axgateBaseUrl / AXLINE_AXGATE_BASE_URL")
	if (!appId) missing.push("authAppId / AXLINE_AUTH_APP_ID")
	if (!username) missing.push("AXLINE_AXGATE_USERNAME")
	if (!password) missing.push("AXLINE_AXGATE_PASSWORD")

	if (missing.length > 0) {
		console.error("Missing configuration:")
		for (const field of missing) {
			console.error(`  - ${field}`)
		}
		console.error("\nExample:")
		console.error(
			"  AXLINE_AXGATE_USERNAME=test1 AXLINE_AXGATE_PASSWORD=secret node apps/vscode/scripts/verify-axgate-device-identity.mjs",
		)
		process.exit(1)
	}

	return { baseUrl, appId, username, password }
}

function clientHeaders(installationId, deviceToken) {
	const headers = {
		"Content-Type": "application/json",
		"X-AxGate-Client-Name": CLIENT_NAME,
		"X-AxGate-Client-Version": CLIENT_VERSION,
		"X-AxGate-Installation-Id": installationId,
	}
	if (deviceToken) {
		headers["X-AxGate-Device-Token"] = deviceToken
	}
	return headers
}

async function parseBody(response) {
	const text = await response.text()
	try {
		return JSON.parse(text)
	} catch {
		return { raw: text }
	}
}

function detailCode(body) {
	const detail = body?.detail
	if (typeof detail === "object" && detail?.code) {
		return detail.code
	}
	return undefined
}

async function requestStep(label, url, init) {
	const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
	const body = await parseBody(response)
	const code = detailCode(body)
	console.log(`${response.ok ? "OK" : "FAIL"}  ${label} → HTTP ${response.status}${code ? ` (${code})` : ""}`)
	if (!response.ok) {
		console.error(JSON.stringify(body, null, 2))
		throw new Error(`${label} failed with HTTP ${response.status}`)
	}
	return body
}

async function main() {
	const config = await loadConfig()
	const installationId = process.env.AXLINE_INSTALLATION_ID?.trim() || randomUUID()

	console.log("Axline ↔ AxGate device identity verification")
	console.log(`  AxGate:          ${config.baseUrl}`)
	console.log(`  App ID:          ${config.appId}`)
	console.log(`  User:            ${config.username}`)
	console.log(`  Installation ID: ${installationId}`)
	console.log(`  Client version:  ${CLIENT_VERSION}`)
	console.log("")

	await requestStep("healthz", `${config.baseUrl}/healthz`, { method: "GET" })

	const loginBody = await requestStep("login", `${config.baseUrl}/api/auth/login`, {
		method: "POST",
		headers: clientHeaders(installationId),
		body: JSON.stringify({
			username: config.username,
			password: config.password,
			appId: config.appId,
		}),
	})

	const accessToken = loginBody.access_token || loginBody.token
	if (!accessToken) {
		throw new Error("Login response did not include access_token")
	}

	const authHeaders = (deviceToken) => ({
		...clientHeaders(installationId, deviceToken),
		Authorization: `Bearer ${accessToken}`,
	})

	await requestStep("session/me (pre-enroll)", `${config.baseUrl}/api/session/me`, {
		method: "GET",
		headers: authHeaders(),
	})

	const enrollBody = await requestStep("devices/enroll", `${config.baseUrl}/api/devices/enroll`, {
		method: "POST",
		headers: authHeaders(),
	})

	const deviceToken = enrollBody.deviceToken
	if (!deviceToken) {
		console.warn("WARN  enroll did not return deviceToken (device may already exist for this installation ID)")
	}

	const meBody = await requestStep("devices/me", `${config.baseUrl}/api/devices/me`, {
		method: "GET",
		headers: authHeaders(deviceToken),
	})

	await requestStep("v1/models", `${config.baseUrl}/v1/models`, {
		method: "GET",
		headers: authHeaders(deviceToken),
	})

	console.log("")
	console.log("Device status:", meBody.status)
	console.log("Device enforcement:", meBody.deviceEnforcement ?? "(not reported)")
	console.log("Version enforcement:", meBody.versionEnforcement ?? "(not reported)")
	if (meBody.status === "pending") {
		console.log("")
		console.log("Next: approve this installation in AxGate Console → Devices, then re-run chat from Axline.")
	}
	console.log("")
	console.log("Verification complete.")
}

main().catch((error) => {
	console.error("")
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})
