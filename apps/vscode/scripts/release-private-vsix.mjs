#!/usr/bin/env bun
/**
 * Canonical Axline AuthNexus private release (build → enterprise repack → upload → verify).
 *
 * Usage:
 *   bun apps/vscode/scripts/release-private-vsix.mjs
 *   bun apps/vscode/scripts/release-private-vsix.mjs --skip-sdk
 *   bun apps/vscode/scripts/release-private-vsix.mjs --skip-upload   # build + repack only
 *
 * Requires ~/.axline/endpoints.json (public fields) and ~/.axline/secrets.json (enrollment + admin).
 * SOP: .agent/project/sop/axline-private-update.md
 */

import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { loadAxlineConfig } from "./lib/load-axline-config.mjs"
import { assertPublishPreflight } from "./lib/preflight-publish.mjs"
import { assertValidVsixLayout, summarizeVsixLayout } from "./lib/vsix-zip.mjs"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const VSCODE_DIR = resolve(__dirname, "..")
const REPO_ROOT = resolve(VSCODE_DIR, "../..")
const BASE_VSIX = join(VSCODE_DIR, "dist", "axline.vsix")
const ENTERPRISE_VSIX = join(VSCODE_DIR, "dist", "axline-enterprise.vsix")

const args = new Set(process.argv.slice(2))
const SKIP_SDK = args.has("--skip-sdk")
const SKIP_UPLOAD = args.has("--skip-upload")

function ensureBunOnPath() {
	const bunHome = join(homedir(), ".bun", "bin")
	if (!process.env.PATH?.includes(bunHome)) {
		process.env.PATH = `${bunHome}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`
	}
}

function run(command, cwd = REPO_ROOT) {
	execSync(command, { cwd, stdio: "inherit", env: process.env, shell: true })
}

async function main() {
	ensureBunOnPath()

	console.log("Axline private release")
	console.log("")

	assertPublishPreflight(VSCODE_DIR)
	run("node scripts/verify-versions.mjs")

	const buildCmd = SKIP_SDK
		? "bun apps/vscode/scripts/publish-private-vsix.mjs --skip-sdk"
		: "bun apps/vscode/scripts/publish-private-vsix.mjs"
	run(buildCmd)

	if (!existsSync(BASE_VSIX)) {
		throw new Error(`Base VSIX not found: ${BASE_VSIX}`)
	}
	await assertValidVsixLayout(BASE_VSIX)
	const baseLayout = await summarizeVsixLayout(BASE_VSIX)
	console.log(`  base layout: ${baseLayout.entryCount} entries, extension/package.json=${baseLayout.hasExtensionPackageJson}`)

	const config = await loadAxlineConfig(VSCODE_DIR)
	if (!config.endpointsPath) {
		throw new Error("No public endpoints.json for enterprise repack. Copy endpoints.example.json → ~/.axline/endpoints.json")
	}

	console.log("")
	console.log("==> Enterprise repack")
	console.log(`  endpoints: ${config.endpointsPath}`)
	run(`bun apps/vscode/scripts/add-endpoints-to-vsix.mjs "${BASE_VSIX}" "${ENTERPRISE_VSIX}" "${config.endpointsPath}"`)
	const enterpriseLayout = await summarizeVsixLayout(ENTERPRISE_VSIX)
	console.log(
		`  enterprise layout: ${enterpriseLayout.entryCount} entries, extension/package.json=${enterpriseLayout.hasExtensionPackageJson}`,
	)

	if (SKIP_UPLOAD) {
		console.log("")
		console.log("Skipped upload/verify (--skip-upload). Next:")
		console.log(`  $env:AXLINE_VSIX_PATH = "${ENTERPRISE_VSIX}"`)
		console.log("  bun apps/vscode/scripts/upload-private-vsix.mjs")
		console.log("  bun apps/vscode/scripts/verify-private-update.mjs")
		return
	}

	process.env.AXLINE_VSIX_PATH = ENTERPRISE_VSIX
	run("bun apps/vscode/scripts/upload-private-vsix.mjs")
	run("bun apps/vscode/scripts/verify-private-update.mjs")

	console.log("")
	console.log("Release complete. Client check: Axline: Check for Updates → install → Reload.")
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})
