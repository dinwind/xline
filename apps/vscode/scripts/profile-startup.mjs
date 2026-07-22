#!/usr/bin/env bun
/**
 * Launch Axline in local VS Code, collect startup phase marks, and print summary.
 *
 * Usage:
 *   bun scripts/profile-startup.mjs [--runs N] [--workspace PATH] [--executable PATH]
 */

import { mkdtempSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import WebSocket from "ws"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, "..")
const EXT_INSPECT_PORT = 9230

function getArg(name, fallback) {
	const idx = process.argv.indexOf(name)
	return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : fallback
}

const RUNS = Number.parseInt(getArg("--runs", "2"), 10)
const WORKSPACE = getArg("--workspace", PROJECT_ROOT)
const WARM_PROFILE_DIR = getArg("--warm-profile-dir", null)
const EXECUTABLE =
	getArg("--executable", null) || process.env.VSCODE_EXECUTABLE_PATH || "C:\\Program Files\\Microsoft VS Code\\Code.exe"
const CLINE_DIR = getArg("--cline-dir", path.join(os.homedir(), ".cline2-profile"))

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

class ExtensionCdp {
	constructor() {
		this.ws = null
		this.nextId = 1
		this.pending = new Map()
	}

	async connect(wsUrl) {
		this.ws = new WebSocket(wsUrl)
		await new Promise((resolve, reject) => {
			this.ws.once("open", resolve)
			this.ws.once("error", reject)
		})
		this.ws.on("message", (data) => {
			const msg = JSON.parse(String(data))
			if (msg.id && this.pending.has(msg.id)) {
				const { resolve, reject } = this.pending.get(msg.id)
				this.pending.delete(msg.id)
				if (msg.error) {
					reject(new Error(msg.error.message || JSON.stringify(msg.error)))
				} else {
					resolve(msg.result)
				}
			}
		})
	}

	send(method, params = {}) {
		const id = this.nextId++
		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject })
			this.ws.send(JSON.stringify({ id, method, params }))
		})
	}

	async enable() {
		await this.send("Runtime.enable")
		await this.send("Debugger.enable")
	}

	close() {
		this.ws?.close()
	}
}

async function waitForInspector(port, timeoutMs = 45000) {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}/json`)
			const targets = await res.json()
			for (const target of targets) {
				if (target.type === "node" || target.title?.includes("Extension Host")) {
					return target.webSocketDebuggerUrl
				}
			}
			if (targets[0]?.webSocketDebuggerUrl) {
				return targets[0].webSocketDebuggerUrl
			}
		} catch {
			// not ready
		}
		await sleep(500)
	}
	throw new Error(`Extension host inspector not available on port ${port}`)
}

async function launchVsCode(userDataDir) {
	const args = [
		`--inspect-extensions=${EXT_INSPECT_PORT}`,
		`--extensionDevelopmentPath=${PROJECT_ROOT}`,
		"--disable-workspace-trust",
		"--no-sandbox",
		"--disable-updates",
		"--skip-welcome",
		"--skip-release-notes",
		"--disable-gpu",
		`--user-data-dir=${userDataDir}`,
		"--disable-extension=saoudrizwan.claude-dev",
		"--disable-extension=saoudrizwan.cline-nightly",
		"--disable-extension=axline.axline",
		WORKSPACE,
	]

	const child = Bun.spawn([EXECUTABLE, ...args], {
		stdout: "pipe",
		stderr: "pipe",
		env: {
			...process.env,
			IS_DEV: "true",
			TEMP_PROFILE: "true",
			DEV_WORKSPACE_FOLDER: PROJECT_ROOT,
			CLINE_ENVIRONMENT: "production",
			CLINE_DIR: CLINE_DIR,
			CLINE_CAPTURE_BROWSER: "1",
		},
	})

	child.stdout
		.pipeTo(
			new WritableStream({
				write(chunk) {
					process.stdout.write(`[vscode] ${chunk}`)
				},
			}),
		)
		.catch(() => {})
	child.stderr
		.pipeTo(
			new WritableStream({
				write(chunk) {
					process.stderr.write(`[vscode] ${chunk}`)
				},
			}),
		)
		.catch(() => {})

	return child
}

async function collectStartupMarks(cdp) {
	const result = await cdp.send("Runtime.evaluate", {
		expression: "JSON.stringify(globalThis.__axlineStartupMarks || [])",
		returnByValue: true,
	})
	const raw = result?.result?.value
	if (!raw) {
		return []
	}
	try {
		return JSON.parse(raw)
	} catch {
		return []
	}
}

function summarizeRun(marks, label) {
	const byScope = new Map()
	for (const mark of marks) {
		if (!byScope.has(mark.scope)) {
			byScope.set(mark.scope, [])
		}
		byScope.get(mark.scope).push(mark)
	}

	const scopes = []
	for (const [scope, scopeMarks] of byScope) {
		const done = scopeMarks.find((m) => m.phase === "done")
		scopes.push({
			scope,
			totalMs: done?.totalMs ?? scopeMarks.at(-1)?.totalMs ?? 0,
			phases: scopeMarks.filter((m) => m.phase !== "begin" && m.phase !== "done"),
		})
	}
	return { _label: label, scopes }
}

function printSummary(allRuns) {
	console.log("\n=== Axline startup profile ===\n")
	console.log(`Executable: ${EXECUTABLE}`)
	console.log(`Workspace:  ${WORKSPACE}`)
	console.log(`CLINE_DIR:  ${CLINE_DIR}\n`)

	for (const [runIndex, run] of allRuns.entries()) {
		const label = run._label ? ` (${run._label})` : ""
		console.log(`Run ${runIndex + 1}${label}:`)
		for (const scope of run.scopes) {
			console.log(`  ${scope.scope}: ${scope.totalMs.toFixed(1)} ms total`)
			for (const phase of scope.phases) {
				console.log(`    - ${phase.phase}: ${phase.deltaMs.toFixed(1)} ms`)
			}
		}
		console.log("")
	}

	if (allRuns.length > 1) {
		const activateTotals = allRuns.map((r) => r.scopes.find((s) => s.scope === "activate")?.totalMs ?? 0)
		const initializeTotals = allRuns.map((r) => r.scopes.find((s) => s.scope === "initialize")?.totalMs ?? 0)
		const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
		console.log("Averages:")
		console.log(`  activate: ${avg(activateTotals).toFixed(1)} ms`)
		console.log(`  initialize: ${avg(initializeTotals).toFixed(1)} ms`)
	}
}

async function profileOnce(userDataDir, label = "run") {
	const child = await launchVsCode(userDataDir)
	const cdp = new ExtensionCdp()

	try {
		const wsUrl = await waitForInspector(EXT_INSPECT_PORT)
		await cdp.connect(wsUrl)
		await cdp.enable()

		// Wait for activate + initialize
		for (let attempt = 0; attempt < 20; attempt++) {
			const marks = await collectStartupMarks(cdp)
			const done = marks.some((m) => m.scope === "activate" && m.phase === "done")
			if (done) {
				return summarizeRun(marks, label)
			}
			await sleep(500)
		}

		return summarizeRun(await collectStartupMarks(cdp), label)
	} finally {
		cdp.close()
		child.kill("SIGTERM")
		await sleep(2000)
	}
}

async function main() {
	console.log("Building extension for profiling...")
	const build = Bun.spawn(["bun", "esbuild.mjs"], {
		cwd: PROJECT_ROOT,
		stdout: "inherit",
		stderr: "inherit",
		env: { ...process.env, IS_DEV: "true" },
	})
	const buildCode = await build.exited
	if (buildCode !== 0) {
		process.exit(buildCode)
	}

	const allRuns = []
	const warmProfileDir = WARM_PROFILE_DIR || mkdtempSync(path.join(os.tmpdir(), "axline-profile-"))
	console.log(`Profile dir: ${warmProfileDir}`)

	for (let i = 0; i < RUNS; i++) {
		console.log(`\n--- Profiling run ${i + 1}/${RUNS} ${i === 0 ? "(cold)" : "(warm)"} ---`)
		allRuns.push(await profileOnce(warmProfileDir, i === 0 ? "cold" : "warm"))
	}

	printSummary(allRuns)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
