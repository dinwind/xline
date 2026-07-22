#!/usr/bin/env node

/**
 * Guard: webview bundle must not transitively import @cline/core (Node/SDK runtime).
 *
 * Webview imports extension code via relative paths (../../../../src/...) and @shared/*.
 * Run as part of check-types before release.
 */

import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const VSCODE_DIR = resolve(__dirname, "..")
const WEBVIEW_SRC = join(VSCODE_DIR, "webview-ui", "src")
const EXT_SRC = join(VSCODE_DIR, "src")
const SHARED_SRC = join(EXT_SRC, "shared")

const FORBIDDEN = ["@cline/core", "@cline/core/"]

const IMPORT_RE =
	/(?:import\s+(?:type\s+)?(?:[\w*{}\s,]+)\s+from\s+|export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+|import\s*\(\s*)["']([^"']+)["']/g

function listSourceFiles(dir) {
	const out = []
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry)
		const st = statSync(full)
		if (st.isDirectory()) {
			if (entry === "node_modules" || entry === "__tests__") continue
			out.push(...listSourceFiles(full))
		} else if (/\.(tsx?|mts|cts)$/.test(entry)) {
			out.push(full)
		}
	}
	return out
}

function resolveImport(fromFile, spec) {
	if (spec.startsWith("@shared/")) {
		const rel = spec.slice("@shared/".length)
		const base = join(SHARED_SRC, rel)
		return resolveTs(base)
	}
	if (spec.startsWith("@/")) {
		const rel = spec.slice(2)
		const base = join(WEBVIEW_SRC, rel)
		return resolveTs(base)
	}
	if (spec.startsWith(".")) {
		return resolveTs(resolve(dirname(fromFile), spec))
	}
	return null
}

function resolveTs(basePath) {
	const candidates = [`${basePath}.ts`, `${basePath}.tsx`, join(basePath, "index.ts"), join(basePath, "index.tsx")]
	for (const c of candidates) {
		try {
			const st = statSync(c)
			if (st.isFile()) return c
		} catch {
			// try next
		}
	}
	return null
}

function extractImports(filePath) {
	const content = readFileSync(filePath, "utf8")
	const specs = []
	for (const match of content.matchAll(IMPORT_RE)) {
		specs.push(match[1])
	}
	return specs
}

function hasForbiddenImport(filePath) {
	const content = readFileSync(filePath, "utf8")
	return FORBIDDEN.some((token) => content.includes(token))
}

function collectWebviewEntryFiles() {
	const webviewFiles = listSourceFiles(WEBVIEW_SRC)
	const entries = new Set()
	for (const file of webviewFiles) {
		for (const spec of extractImports(file)) {
			if (spec.startsWith("@shared/") || spec.includes("/src/") || spec.startsWith("../")) {
				const resolved = resolveImport(file, spec)
				if (resolved) entries.add(resolved)
			}
		}
	}
	return entries
}

function walkTransitive(startFiles) {
	const queue = [...startFiles]
	const seen = new Set()
	const violations = []

	while (queue.length) {
		const file = queue.shift()
		if (!file || seen.has(file)) continue
		seen.add(file)

		if (hasForbiddenImport(file)) {
			violations.push(file)
			continue
		}

		for (const spec of extractImports(file)) {
			if (spec.startsWith("@shared/") || spec.startsWith("@/") || spec.startsWith(".")) {
				const resolved = resolveImport(file, spec)
				if (resolved && !seen.has(resolved)) queue.push(resolved)
			}
		}
	}

	return violations
}

function main() {
	const entries = collectWebviewEntryFiles()
	const violations = walkTransitive(entries)

	if (violations.length) {
		console.error("Webview import boundary check FAILED.")
		console.error("These extension/shared modules are in the webview bundle chain but import @cline/core:\n")
		for (const v of violations) {
			console.error(`  - ${v.replace(VSCODE_DIR + "\\", "").replace(VSCODE_DIR + "/", "")}`)
		}
		console.error("\nFix: move shared constants to @shared/* or inline in webview-safe modules.")
		console.error("See: .agent/project/sop/vscode-typescript-build-pitfalls.md")
		process.exit(1)
	}

	console.log("Webview import boundary check OK")
}

main()
