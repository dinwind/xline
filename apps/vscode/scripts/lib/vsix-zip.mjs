import { execSync } from "node:child_process"
import { open, readdir, rename, rm } from "node:fs/promises"

const ZIP_MAGIC = [0x50, 0x4b]
const REQUIRED_VSIX_ENTRIES = ["extension/package.json", "extension.vsixmanifest", "[Content_Types].xml"]
const EXTENSION_PACKAGE_JSON = Buffer.from("extension/package.json")
const BAD_LAYOUT_PREFIX = Buffer.from("./extension/package.json")

export async function assertValidVsixZip(filePath) {
	const handle = await open(filePath, "r")
	try {
		const header = Buffer.alloc(2)
		await handle.read(header, 0, 2, 0)
		if (header[0] !== ZIP_MAGIC[0] || header[1] !== ZIP_MAGIC[1]) {
			throw new Error(
				`${filePath} is not a valid VSIX (ZIP) archive. ` +
					"VSIX files must start with PK zip magic bytes; tar or truncated downloads will fail to install.",
			)
		}
	} finally {
		await handle.close()
	}
}

export function listVsixPathsFromTarListing(listing) {
	return new Set(
		listing
			.split(/\r?\n/)
			.map((line) => line.trim().replace(/\\/g, "/"))
			.filter(Boolean),
	)
}

export function assertValidVsixLayoutFromBuffer(data) {
	assertValidVsixZipFromBuffer(data)
	if (indexOfBuffer(data, BAD_LAYOUT_PREFIX) !== -1) {
		throw new Error("VSIX has invalid zip paths (./ prefix). VS Code requires extension/package.json at zip root.")
	}
	if (indexOfBuffer(data, EXTENSION_PACKAGE_JSON) === -1) {
		throw new Error("VSIX is missing extension/package.json inside the zip archive.")
	}
}

export function assertValidVsixZipFromBuffer(data) {
	if (data.length < 2 || data[0] !== ZIP_MAGIC[0] || data[1] !== ZIP_MAGIC[1]) {
		throw new Error(
			"Downloaded update is not a valid VSIX (ZIP) archive. The release artifact may be corrupted or packaged incorrectly.",
		)
	}
}

export async function readVsixTarListing(filePath) {
	return execSync(`tar -tf "${filePath}"`, { encoding: "utf8", shell: true })
}

export async function assertValidVsixLayout(filePath) {
	await assertValidVsixZip(filePath)
	const listing = await readVsixTarListing(filePath)
	const paths = listVsixPathsFromTarListing(listing)

	if ([...paths].some((entry) => entry.startsWith("./"))) {
		throw new Error(
			`${filePath} has invalid VSIX zip paths (./ prefix). ` +
				"VS Code requires extension/package.json at zip root; repack with explicit entries, not tar -C dir .",
		)
	}

	const missing = REQUIRED_VSIX_ENTRIES.filter((required) => !paths.has(required))
	if (missing.length > 0) {
		throw new Error(
			`${filePath} is missing required VSIX entries: ${missing.join(", ")}. ` +
				"Check enterprise repack output layout before upload.",
		)
	}
}

export async function summarizeVsixLayout(filePath) {
	const listing = await readVsixTarListing(filePath)
	const paths = [...listVsixPathsFromTarListing(listing)].sort()
	const hasDotPrefix = paths.some((entry) => entry.startsWith("./"))
	const topLevel = paths.filter((entry) => !entry.includes("/") || entry.endsWith("/")).slice(0, 8)
	return {
		entryCount: paths.length,
		hasDotPrefix,
		hasExtensionPackageJson: paths.includes("extension/package.json"),
		topLevelPreview: topLevel,
	}
}

export async function listVsixTopLevelEntries(sourceDir) {
	const entries = await readdir(sourceDir)
	if (entries.length === 0) {
		throw new Error(`No files to pack in ${sourceDir}`)
	}
	return entries
}

export function quoteTarEntries(entries) {
	return entries.map((entry) => `"${entry.replace(/"/g, '\\"')}"`).join(" ")
}

export async function createZipVsixFromDir(sourceDir, vsixPath) {
	const zipPath = vsixPath.replace(/\.vsix$/i, ".zip")
	await rm(zipPath, { force: true })
	const entries = await listVsixTopLevelEntries(sourceDir)
	execSync(`tar -acf "${zipPath}" -C "${sourceDir}" ${quoteTarEntries(entries)}`, {
		stdio: "inherit",
		shell: true,
	})
	await rename(zipPath, vsixPath)
	await assertValidVsixLayout(vsixPath)
}

function indexOfBuffer(haystack, needle) {
	outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
		for (let j = 0; j < needle.length; j++) {
			if (haystack[i + j] !== needle[j]) {
				continue outer
			}
		}
		return i
	}
	return -1
}
