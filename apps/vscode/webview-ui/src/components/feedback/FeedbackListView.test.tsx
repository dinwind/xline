import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FeedbackListView } from "./FeedbackListView"

describe("FeedbackListView", () => {
	it("shows empty state for mine scope", () => {
		render(
			<FeedbackListView
				items={[]}
				loading={false}
				onOpenDetail={() => {}}
				onOpenNew={() => {}}
				onRefresh={() => {}}
				onScopeChange={() => {}}
				scope="mine"
			/>,
		)
		expect(screen.getByText(/No feedback yet/i)).toBeTruthy()
	})

	it("opens detail when a row is clicked", () => {
		const onOpenDetail = vi.fn()
		render(
			<FeedbackListView
				items={[
					{
						id: "1",
						number: 3,
						type: "BUG",
						title: "autotest_row",
						status: "OPEN",
						statusLabel: "Open",
						visibility: "PRIVATE",
						updatedAt: new Date().toISOString(),
						createdAt: new Date().toISOString(),
					},
				]}
				loading={false}
				onOpenDetail={onOpenDetail}
				onOpenNew={() => {}}
				onRefresh={() => {}}
				onScopeChange={() => {}}
				scope="mine"
			/>,
		)
		fireEvent.click(screen.getByText("autotest_row"))
		expect(onOpenDetail).toHaveBeenCalledWith(3)
	})
})
