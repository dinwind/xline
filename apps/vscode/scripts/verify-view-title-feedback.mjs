/**
 * Local gate: Feedback must appear in view/title between Account and Settings.
 * Run: bun apps/vscode/scripts/verify-view-title-feedback.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))

const commands = pkg.contributes?.commands ?? []
const openFeedback = commands.find((c) => c.command === "axline.openFeedback")
if (!openFeedback) {
	console.error("FAIL: axline.openFeedback command missing")
	process.exit(1)
}
if (!String(openFeedback.icon || "").includes("feedback")) {
	console.error("FAIL: axline.openFeedback must use $(feedback) icon, got", openFeedback.icon)
	process.exit(1)
}

const titleMenus = (pkg.contributes?.menus?.["view/title"] ?? []).filter(
	(m) => m.when === "view == axline.SidebarProvider" && String(m.group || "").startsWith("navigation@"),
)

const parsed = titleMenus.map((m) => {
	const n = Number(String(m.group).split("@")[1])
	return { command: m.command, order: n }
})
parsed.sort((a, b) => a.order - b.order)

const ids = parsed.map((p) => p.command)
const accountIdx = ids.indexOf("axline.accountButtonClicked")
const feedbackIdx = ids.indexOf("axline.openFeedback")
const settingsIdx = ids.indexOf("axline.settingsButtonClicked")

console.log("view/title navigation order:", parsed.map((p) => `${p.order}:${p.command.replace("axline.", "")}`).join(" → "))

if (accountIdx < 0 || feedbackIdx < 0 || settingsIdx < 0) {
	console.error("FAIL: Account, Feedback, or Settings missing from view/title navigation")
	process.exit(1)
}
if (!(accountIdx < feedbackIdx && feedbackIdx < settingsIdx)) {
	console.error("FAIL: expected Account → Feedback → Settings")
	process.exit(1)
}

console.log("OK: Feedback is between Account and Settings in view/title")
