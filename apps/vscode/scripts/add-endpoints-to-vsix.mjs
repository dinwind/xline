#!/usr/bin/env bun
/**
 * Inject a public-only endpoints.json into a VSIX for enterprise distribution.
 *
 * The input file MUST NOT contain updateEnrollmentCode (client secret).
 * Enrollment codes belong in ~/.axline/secrets.json on each machine.
 *
 * Usage:
 *   bun apps/vscode/scripts/add-endpoints-to-vsix.mjs <source.vsix> <output.vsix> <endpoints.public.json>
 */

import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createZipVsixFromDir } from "./lib/vsix-zip.mjs"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

function usage() {
	console.error("Usage: bun apps/vscode/scripts/add-endpoints-to-vsix.mjs <source.vsix> <output.vsix> <endpoints.json>")
	process.exit(1)
}

function assertPublicEndpoints(data, filePath) {
	if (data.updateEnrollmentCode) {
		throw new Error(
			`${filePath} must not contain updateEnrollmentCode. Put enrollment codes in ~/.axline/secrets.json instead.`,
		)
	}
	const hasPublicField = Boolean(
		data.axgateBaseUrl?.trim() || data.authNexusBaseUrl?.trim() || data.updateAppId?.trim() || data.appBaseUrl?.trim(),
	)
	if (!hasPublicField) {
		throw new Error(`${filePath} must include at least one public endpoint field (e.g. axgateBaseUrl).`)
	}
}

function extractVsix(vsixPath, destDir) {
	execSync(`tar -xf "${vsixPath}" -C "${destDir}"`, { stdio: "inherit", shell: true })
}

async function createVsix(sourceDir, vsixPath) {
	await createZipVsixFromDir(sourceDir, vsixPath)
}

async function main() {
	const [sourceVsix, outputVsix, endpointsPath] = process.argv.slice(2)
	if (!sourceVsix || !outputVsix || !endpointsPath) {
		usage()
	}

	const source = resolve(sourceVsix)
	const output = resolve(outputVsix)
	const endpointsFile = resolve(endpointsPath)

	if (!existsSync(source)) {
		throw new Error(`Source VSIX not found: ${source}`)
	}
	if (!existsSync(endpointsFile)) {
		throw new Error(`Endpoints file not found: ${endpointsFile}`)
	}

	let endpointsRaw = await readFile(endpointsFile, "utf8")
	if (endpointsRaw.charCodeAt(0) === 0xfeff) {
		endpointsRaw = endpointsRaw.slice(1)
	}
	const endpoints = JSON.parse(endpointsRaw)
	assertPublicEndpoints(endpoints, endpointsFile)

	const tempDir = join(__dirname, ".tmp-add-endpoints-to-vsix")
	await rm(tempDir, { recursive: true, force: true })
	await mkdir(tempDir, { recursive: true })

	try {
		extractVsix(source, tempDir)
		const extensionDir = join(tempDir, "extension")
		if (!existsSync(extensionDir)) {
			throw new Error("VSIX layout invalid: missing extension/ directory")
		}
		await writeFile(join(extensionDir, "endpoints.json"), `${JSON.stringify(endpoints, null, "\t")}\n`, "utf8")
		await createVsix(tempDir, output)
		console.log(`Created enterprise VSIX: ${output}`)
		console.log("Bundled public endpoints only. Deploy ~/.axline/secrets.json separately for private update.")
	} finally {
		await rm(tempDir, { recursive: true, force: true })
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})
