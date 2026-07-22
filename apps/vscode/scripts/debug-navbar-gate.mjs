import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const extRoot = path.join(os.homedir(), ".vscode", "extensions")
const dir = fs
	.readdirSync(extRoot)
	.filter((n) => n.startsWith("axline.axline-"))
	.sort()
	.reverse()[0]
const c = fs.readFileSync(path.join(extRoot, dir, "webview-ui/build/assets/index.js"), "utf8")

const count = (s) => {
	let n = 0
	let i = 0
	while ((i = c.indexOf(s, i)) >= 0) {
		n++
		i++
	}
	return n
}

console.log({
	dir,
	newTask: count("New Task"),
	customizeId: count('id:"customize"'),
	feedbackId: count('id:"feedback"'),
	navbarContainer: count("cline-navbar-container"),
	showNavbarFalse: c.includes("showNavbar:!1"),
	vonGate: c.includes("U?b.jsx(tqn,{}):null") || c.includes("Von()?"),
})

// Find if ChatView still embeds navbar somehow
const chatIdx = c.indexOf("isHidden:s||u||i||a||d||h||f")
console.log("chatView call snippet:", c.slice(chatIdx - 80, chatIdx + 120))

// Local source platform config
const localCfg = JSON.parse(
	fs.readFileSync(path.join(process.cwd(), "apps/vscode/webview-ui/src/config/platform-configs.json"), "utf8"),
)
console.log("local platform-configs vscode.showNavbar =", localCfg.vscode.showNavbar)
