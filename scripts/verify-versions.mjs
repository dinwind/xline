#!/usr/bin/env node
/**
 * Axline — Version Consistency Check
 *
 * Asserts apps/vscode/package.json version equals
 * version-state.toml tracks.vscode.working_version.
 *
 * Usage:
 *   node scripts/verify-versions.mjs
 *   node scripts/verify-versions.mjs --strict   # also fail if working == current_release while status is developing
 *
 * Exit: 0 ok, 1 drift, 2 parse/missing
 */
import { readFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "..")
const strict = process.argv.includes("--strict")

function fail(code, message) {
	console.error(message)
	process.exit(code)
}

function readJsonVersion(relPath) {
	const full = join(repoRoot, relPath)
	if (!existsSync(full)) {
		fail(2, `Canonical source not found: ${relPath}`)
	}
	const data = JSON.parse(readFileSync(full, "utf8"))
	const version = data?.version
	if (typeof version !== "string" || !version.trim()) {
		fail(2, `version field missing in ${relPath}`)
	}
	return version.trim()
}

function readTrackState(tomlText, track) {
	const section = `tracks.${track}`
	const lines = tomlText.split(/\r?\n/)
	let inSection = false
	const fields = {}
	for (const line of lines) {
		const header = line.match(/^\s*\[(.+?)\]\s*$/)
		if (header) {
			inSection = header[1] === section
			continue
		}
		if (!inSection) continue
		const m = line.match(/^\s*(\w+)\s*=\s*"([^"]*)"\s*$/)
		if (m) fields[m[1]] = m[2]
	}
	return fields
}

const statePath = join(repoRoot, ".agent", "project", "version-state.toml")
if (!existsSync(statePath)) {
	fail(2, `version-state.toml not found at ${statePath}`)
}

const stateText = readFileSync(statePath, "utf8")
const track = readTrackState(stateText, "vscode")
if (!track.working_version || !track.current_release || !track.canonical_source) {
	fail(2, "tracks.vscode missing working_version / current_release / canonical_source")
}

const canonicalVersion = readJsonVersion(track.canonical_source)
const working = track.working_version
const current = track.current_release
const status = track.status || ""

let drift = false

if (canonicalVersion !== working) {
	console.error(
		`DRIFT: ${track.canonical_source} version=${canonicalVersion} != working_version=${working}`,
	)
	drift = true
} else {
	console.log(`OK: canonical ${canonicalVersion} == working_version ${working}`)
}

if (strict && status === "developing" && working === current) {
	console.error(
		`STRICT: working_version == current_release (${working}) while status=developing — bump working version before shipping new runtime changes`,
	)
	drift = true
}

if (drift) process.exit(1)
console.log(`Track vscode: current_release=${current} status=${status}`)
process.exit(0)
