import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const extRoot = path.join(os.homedir(), ".vscode", "extensions")
const dirs = fs
	.readdirSync(extRoot)
	.filter((n) => n.startsWith("axline.axline-"))
	.sort()
	.reverse()
if (!dirs.length) {
	console.error("No axline extension installed under ~/.vscode/extensions")
	process.exit(1)
}
const ext = path.join(extRoot, dirs[0])
const pkg = JSON.parse(fs.readFileSync(path.join(ext, "package.json"), "utf8"))
function findIndexJs(dir) {
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, ent.name)
		if (ent.isDirectory()) {
			const hit = findIndexJs(p)
			if (hit) return hit
		} else if (ent.name === "index.js" && p.includes(`${path.sep}webview-ui${path.sep}build${path.sep}`)) {
			return p
		}
	}
	return null
}
const js = findIndexJs(ext)
const c = fs.readFileSync(js, "utf8")
const checks = {
	version: pkg.version,
	js,
	hasIdFeedback: c.includes('id:"feedback"'),
	hasCodiconFeedback: c.includes("codicon-feedback"),
	hasNavbarContainer: c.includes("cline-navbar-container"),
	hasAppLevelComment: c.includes("Shared chrome"),
	accountThenFeedback: /id:"account"[\s\S]{0,120}id:"feedback"[\s\S]{0,120}id:"settings"/.test(c),
}
console.log(JSON.stringify(checks, null, 2))
const i = c.indexOf('id:"feedback"')
if (i >= 0) console.log("snippet:", c.slice(Math.max(0, i - 60), i + 160))
