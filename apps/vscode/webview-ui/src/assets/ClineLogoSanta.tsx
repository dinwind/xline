import { SVGProps } from "react"
import type { Environment } from "../../../src/shared/config-types"
import { getEnvironmentColor } from "../utils/environmentColors"

/**
 * Axline logo — minimalist upward triangle with theme and environment color support.
 */
const ClineLogoSanta = (props: SVGProps<SVGSVGElement> & { environment?: Environment }) => {
	const { environment, ...svgProps } = props

	const fillColor = environment ? getEnvironmentColor(environment) : "var(--vscode-icon-foreground)"

	return (
		<svg fill="none" height="50" viewBox="0 0 50 50" width="50" xmlns="http://www.w3.org/2000/svg" {...svgProps}>
			<path d="M25 6 L42 42 H8 Z" fill={fillColor} />
		</svg>
	)
}
export default ClineLogoSanta
