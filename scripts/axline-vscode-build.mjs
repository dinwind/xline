#!/usr/bin/env bun
/**
 * Build and optionally install the Axline VS Code extension (local VSIX).
 *
 * Replaces the multi-step manual flow documented in README.md and
 * .agent/project/axline-vscode-publish.md so agents and humans can run
 * one command instead of rediscovering PATH / step order each session.
 *
 * Usage:
 *   bun scripts/axline-vscode-build.mjs              # build VSIX only
 *   bun scripts/axline-vscode-build.mjs --install      # build + install into VS Code
 *   bun scripts/axline-vscode-build.mjs --skip-deps   # skip bun install
 *   bun scripts/axline-vscode-build.mjs --skip-sdk    # skip build:sdk (fast rebuild)
 *
 * Output:
 *   apps/vscode/dist/axline.vsix
 *
 * Prerequisites:
 *   - bun (auto-added from %USERPROFILE%\.bun\bin on Windows when missing from PATH)
 *   - `code` CLI on PATH when using --install
 */

import { execFileSync, execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const REPO_ROOT = resolve(__dirname, "..")
const VSCODE_DIR = join(REPO_ROOT, "apps", "vscode")
const VSIX_PATH = join(VSCODE_DIR, "dist", "axline.vsix")
const EXTENSION_ID = "axline.axline"

const args = new Set(process.argv.slice(2))
const INSTALL = args.has("--install")
const SKIP_DEPS = args.has("--skip-deps")
const SKIP_SDK = args.has("--skip-sdk")

function ensureBunOnPath() {
	const bunHome = join(homedir(), ".bun", "bin")
	if (!process.env.PATH?.split(";").concat(process.env.PATH?.split(":") ?? []).includes(bunHome)) {
		process.env.PATH = `${bunHome}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`
	}
	try {
		execFileSync("bun", ["--version"], { stdio: "pipe", env: process.env })
	} catch {
		console.error("ERROR: bun not found. Install from https://bun.sh and retry.")
		process.exit(1)
	}
}

function run(label, command, cwd = REPO_ROOT) {
	console.log(`\n==> ${label}`)
	execSync(command, { cwd, stdio: "inherit", env: process.env, shell: true })
}

function commandExists(name) {
	try {
		execFileSync(name, ["--version"], { stdio: "pipe", env: process.env })
		return true
	} catch {
		return false
	}
}

/** VS Code CLI still uses deprecated url.parse() when syncing gallery metadata (DEP0169). */
function envSuppressingVsCodeDeprecationWarning() {
	const flag = "--disable-warning=DEP0169"
	const existing = process.env.NODE_OPTIONS?.trim()
	return {
		...process.env,
		NODE_OPTIONS: existing ? `${existing} ${flag}` : flag,
	}
}

function installVsix(vsixPath) {
	execSync(`code --install-extension "${vsixPath}" --force`, {
		stdio: "inherit",
		env: envSuppressingVsCodeDeprecationWarning(),
		shell: true,
	})
}

function main() {
	console.log("Axline VS Code build")
	console.log(`  repo:   ${REPO_ROOT}`)
	console.log(`  output: ${VSIX_PATH}`)

	ensureBunOnPath()

	if (!SKIP_DEPS) {
		run("Install dependencies", "bun install --frozen-lockfile")
	}

	if (!SKIP_SDK) {
		run("Build SDK packages", "bun run build:sdk")
	}

	run("Build extension", "bun run package", VSCODE_DIR)
	run("Package VSIX", "bun run package:vsix", VSCODE_DIR)

	if (!existsSync(VSIX_PATH)) {
		console.error(`ERROR: VSIX not found at ${VSIX_PATH}`)
		process.exit(1)
	}

	console.log("\n==> Done")
	console.log(`  VSIX: ${VSIX_PATH}`)

	if (INSTALL) {
		if (!commandExists("code")) {
			console.error("ERROR: `code` CLI not found. Install VS Code shell command or run without --install.")
			process.exit(1)
		}
		console.log("\n==> Install extension")
		installVsix(VSIX_PATH)
		console.log(`  Installed: ${EXTENSION_ID}`)
		console.log("  Reload VS Code (Developer: Reload Window) to activate.")
	} else {
		console.log(`  Install: bun run install:vscode`)
	}
}

main()
