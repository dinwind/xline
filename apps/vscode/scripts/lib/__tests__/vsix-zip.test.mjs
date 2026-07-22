import { afterEach, describe, expect, it } from "bun:test"
import { execSync } from "node:child_process"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
	assertValidVsixLayoutFromBuffer,
	assertValidVsixZipFromBuffer,
	createZipVsixFromDir,
	listVsixPathsFromTarListing,
} from "../vsix-zip.mjs"

describe("vsix-zip", () => {
	let workDir = ""

	afterEach(async () => {
		if (workDir) {
			await rm(workDir, { recursive: true, force: true })
			workDir = ""
		}
	})

	it("accepts buffer with extension/package.json at zip root", () => {
		const data = Buffer.from("PK\x03\x04prefix-extension/package.json-suffix")
		expect(() => assertValidVsixLayoutFromBuffer(data)).not.toThrow()
	})

	it("rejects buffer with ./extension/package.json prefix", () => {
		const data = Buffer.from("PK\x03\x04./extension/package.json")
		expect(() => assertValidVsixLayoutFromBuffer(data)).toThrow("./ prefix")
	})

	it("rejects non-zip buffer", () => {
		const data = Buffer.from("./extension/package.json")
		expect(() => assertValidVsixZipFromBuffer(data)).toThrow("not a valid VSIX")
	})

	it("createZipVsixFromDir writes extension/package.json without ./ prefix", async () => {
		workDir = join(tmpdir(), `vsix-zip-test-${Date.now()}`)
		const sourceDir = join(workDir, "source")
		const vsixPath = join(workDir, "out.vsix")
		await mkdir(join(sourceDir, "extension"), { recursive: true })
		await writeFile(join(sourceDir, "extension", "package.json"), '{"name":"test"}\n', "utf8")
		await writeFile(join(sourceDir, "extension.vsixmanifest"), "<xml/>", "utf8")
		await writeFile(join(sourceDir, "[Content_Types].xml"), "<Types/>", "utf8")

		await createZipVsixFromDir(sourceDir, vsixPath)

		const listing = execSync(`tar -tf "${vsixPath}"`, { encoding: "utf8", shell: true })
		const paths = listVsixPathsFromTarListing(listing)
		expect(paths.has("extension/package.json")).toBe(true)
		expect([...paths].some((entry) => entry.startsWith("./"))).toBe(false)
	})
})
