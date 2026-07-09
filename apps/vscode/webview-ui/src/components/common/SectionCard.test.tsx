import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CopyableCode, EmptyState, IconButton, SectionBody, SectionCard, SectionHeader, StatusDot } from "./SectionCard"

describe("SectionCard", () => {
	it("renders header, body, and status dot", () => {
		render(
			<SectionCard>
				<SectionHeader count={2} icon="plug" title="Providers" />
				<SectionBody>
					<StatusDot health="ok" pulse />
					<span>Gateway healthy</span>
				</SectionBody>
			</SectionCard>,
		)

		expect(screen.getByText("Providers")).toBeInTheDocument()
		expect(screen.getByText("2")).toBeInTheDocument()
		expect(screen.getByText("Gateway healthy")).toBeInTheDocument()
	})

	it("renders empty state with hint text", () => {
		render(<EmptyState icon="circuit-board">No models permitted for your account.</EmptyState>)

		expect(screen.getByText("No models permitted for your account.")).toBeInTheDocument()
	})

	it("copies value to clipboard on click", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined)
		Object.assign(navigator, { clipboard: { writeText } })

		render(<CopyableCode value="ide-user-123" />)

		fireEvent.click(screen.getByRole("button", { name: "ide-user-123" }))
		expect(writeText).toHaveBeenCalledWith("ide-user-123")
	})

	it("fires icon button click handler", () => {
		const onClick = vi.fn()

		render(<IconButton icon="refresh" onClick={onClick} title="Refresh" />)

		fireEvent.click(screen.getByRole("button", { name: "Refresh" }))
		expect(onClick).toHaveBeenCalledTimes(1)
	})
})
