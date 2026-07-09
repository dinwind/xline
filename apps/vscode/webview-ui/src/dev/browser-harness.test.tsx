import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import App from "../App"
import { installMockExtensionHost } from "./mock-extension-host"

vi.mock("posthog-js", () => ({
	default: {
		init: vi.fn(),
		set_config: vi.fn(),
		has_opted_in_capturing: vi.fn(() => false),
		has_opted_out_capturing: vi.fn(() => false),
		identify: vi.fn(),
		opt_in_capturing: vi.fn(),
		opt_out_capturing: vi.fn(),
	},
}))

vi.mock("posthog-js/react", () => ({
	PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe("browser dev harness", () => {
	it("hydrates state and opens account view with mock host", async () => {
		window.history.replaceState({}, "", "/?view=account")
		installMockExtensionHost()

		render(<App />)

		await waitFor(
			() => {
				expect(screen.getByText("Account")).toBeInTheDocument()
			},
			{ timeout: 5000 },
		)
	})
})
