import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LoginGate } from "./LoginGate"

const navigateToAccount = vi.fn()

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		navigateToAccount,
	}),
}))

describe("LoginGate", () => {
	it("routes to account login and never mentions token storage in the panel", () => {
		const onLogin = vi.fn()
		render(<LoginGate onLogin={onLogin} />)
		expect(screen.getByText(/Tokens never enter this panel/i)).toBeTruthy()
		fireEvent.click(screen.getByText(/Sign in to Axline/i))
		expect(onLogin).toHaveBeenCalledTimes(1)
		expect(navigateToAccount).toHaveBeenCalledTimes(1)
	})
})
