import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { setupBrowserDevHarness } from "./dev/browser-harness"
import "./main.css"
import "./index.css"
import App from "./App.tsx"

setupBrowserDevHarness()

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
