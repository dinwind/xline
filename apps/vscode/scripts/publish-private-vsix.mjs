#!/usr/bin/env bun

/**
 * Build Axline VSIX and print AuthNexus upload metadata (SHA256).
 *
 * Usage:
 *   bun apps/vscode/scripts/publish-private-vsix.mjs
 *   bun apps/vscode/scripts/publish-private-vsix.mjs --skip-sdk
 *
 * Before packaging: ensure apps/vscode/endpoints.json does NOT exist (secrets must not ship in VSIX).
 *
 * After build:
 *   bun apps/vscode/scripts/upload-private-vsix.mjs   # CLI upload (recommended)
 *   bun apps/vscode/scripts/verify-private-update.mjs
 *
 * SOP: .agent/project/sop/axline-private-update.md
 */

import { execSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { assertPublishPreflight } from "./lib/preflight-publish.mjs"
import { assertValidVsixLayout, summarizeVsixLayout } from "./lib/vsix-zip.mjs"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const REPO_ROOT = resolve(__dirname, "../../..")
const VSCODE_DIR = join(REPO_ROOT, "apps", "vscode")
const VSIX_PATH = join(VSCODE_DIR, "dist", "axline.vsix")
const PACKAGE_JSON = join(VSCODE_DIR, "package.json")

const args = new Set(process.argv.slice(2))
const SKIP_SDK = args.has("--skip-sdk")

function ensureBunOnPath() {
	const bunHome = join(homedir(), ".bun", "bin")
	if (!process.env.PATH?.includes(bunHome)) {
		process.env.PATH = `${bunHome}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`
	}
}

function run(command, cwd = REPO_ROOT) {
	execSync(command, { cwd, stdio: "inherit", env: process.env, shell: true })
}

async function sha256File(filePath) {
	const data = await readFile(filePath)
	return createHash("sha256").update(data).digest("hex").toUpperCase()
}

async function main() {
	ensureBunOnPath()
	const pkg = JSON.parse(await readFile(PACKAGE_JSON, "utf8"))
	const version = pkg.version ?? "unknown"

	console.log("Axline private VSIX publish helper")
	console.log(`  target version: ${version}`)

	assertPublishPreflight(VSCODE_DIR)

	if (!SKIP_SDK) {
		run("bun run build:sdk")
	}
	run("bun run package", VSCODE_DIR)
	run("bun run package:vsix", VSCODE_DIR)

	if (!existsSync(VSIX_PATH)) {
		console.error(`VSIX not found: ${VSIX_PATH}`)
		process.exit(1)
	}

	const hash = await sha256File(VSIX_PATH)
	const size = (await readFile(VSIX_PATH)).byteLength
	await assertValidVsixLayout(VSIX_PATH)
	const layout = await summarizeVsixLayout(VSIX_PATH)

	console.log("\n==> AuthNexus upload metadata")
	console.log(`  artifact:  ${VSIX_PATH}`)
	console.log(`  version:   ${version}`)
	console.log(`  fileSize:  ${size}`)
	console.log(`  fileHash:  ${hash}`)
	console.log(`  layout:    ${layout.entryCount} entries, extension/package.json=${layout.hasExtensionPackageJson}`)
	console.log("\nNext steps:")
	console.log("  1. Ensure endpoints.json is NOT in apps/vscode/ (only for local scripts)")
	console.log("  2. bun apps/vscode/scripts/release-private-vsix.mjs --skip-sdk   # enterprise repack + upload + verify")
	console.log("     Or stepwise: add-endpoints-to-vsix.mjs → upload-private-vsix.mjs → verify-private-update.mjs")
	console.log("  SOP: .agent/project/sop/axline-private-update.md")
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})
