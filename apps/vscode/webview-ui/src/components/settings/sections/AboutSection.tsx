import { VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import Section from "../Section"

interface AboutSectionProps {
	version: string
	renderSectionHeader: (tabId: string) => JSX.Element | null
}
const AboutSection = ({ version, renderSectionHeader }: AboutSectionProps) => {
	const { navigateToFeedback } = useExtensionState()

	return (
		<div>
			{renderSectionHeader("about")}
			<Section>
				<div className="flex px-4 flex-col gap-2">
					<h2 className="text-lg font-semibold">v{version}</h2>
					<p className="m-0 text-sm text-(--vscode-descriptionForeground)">
						Send bugs, feature requests, and questions to the Axline Feedback Hub.
					</p>
					<VSCodeLink
						href="#"
						onClick={(event) => {
							event.preventDefault()
							navigateToFeedback("new")
						}}>
						Send Feedback
					</VSCodeLink>
				</div>
			</Section>
		</div>
	)
}

export default AboutSection
