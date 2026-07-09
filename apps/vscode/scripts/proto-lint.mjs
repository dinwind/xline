import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = fileURLToPath(new URL(".", import.meta.url))
const vscodeDir = join(scriptDir, "..")
const protoDir = join(vscodeDir, "proto")
const localBuf = join(vscodeDir, "node_modules", "@bufbuild", "buf", "bin", "buf")

function runBuf(args) {
	const useLocal = existsSync(localBuf)
	const command = useLocal ? process.execPath : "buf"
	const commandArgs = useLocal ? [localBuf, ...args] : args

	const result = spawnSync(command, commandArgs, {
		cwd: vscodeDir,
		stdio: "inherit",
		shell: false,
	})

	if (result.error) {
		console.error(`ERROR: failed to run buf ${args.join(" ")}: ${result.error.message}`)
		process.exit(1)
	}

	return result.status ?? 1
}

function walkProtoFiles(dir) {
	const files = []
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const fullPath = join(dir, entry.name)
		if (entry.isDirectory()) {
			files.push(...walkProtoFiles(fullPath))
		} else if (entry.isFile() && entry.name.endsWith(".proto")) {
			files.push(fullPath)
		}
	}
	return files
}

function lintRepeatedCapitalRpcNames() {
	const pattern = /rpc .*[A-Z][A-Z].*[(]/
	let found = false

	for (const file of walkProtoFiles(protoDir)) {
		const lines = readFileSync(file, "utf8").split(/\r?\n/)
		lines.forEach((line, index) => {
			if (pattern.test(line)) {
				console.log(`${relative(vscodeDir, file)}:${index + 1}:${line}`)
				found = true
			}
		})
	}

	if (found) {
		// See https://github.com/cline/cline/pull/7054
		console.error("Error: Proto RPC names cannot contain repeated capital letters")
		process.exit(1)
	}
}

function ensureBufAvailable() {
	if (existsSync(localBuf)) {
		return
	}

	const probe = spawnSync("buf", ["--version"], { cwd: vscodeDir, stdio: "pipe", shell: process.platform === "win32" })
	if (probe.error || probe.status !== 0) {
		console.error("ERROR: buf CLI not found. Run bun install in apps/vscode (@bufbuild/buf).")
		process.exit(1)
	}
}

ensureBufAvailable()

const lintStatus = runBuf(["lint"])
if (lintStatus !== 0) {
	process.exit(lintStatus)
}

const formatStatus = runBuf(["format", "-w", "--exit-code"])
if (formatStatus !== 0) {
	console.log("Proto files were formatted")
}

lintRepeatedCapitalRpcNames()
