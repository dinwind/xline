import { SVGProps } from "react"
import type { Environment } from "../../../src/shared/config-types"
import { getEnvironmentColor } from "../utils/environmentColors"
import { AXLINE_LOGO_PATH, AXLINE_LOGO_VIEWBOX } from "./axlineLogoPath"

/**
 * Axline logo — three leaning bars with theme and environment color support.
 */
const ClineLogoSanta = (props: SVGProps<SVGSVGElement> & { environment?: Environment }) => {
	const { environment, ...svgProps } = props

	const fillColor = environment ? getEnvironmentColor(environment) : "var(--vscode-icon-foreground)"

	return (
		<svg fill="none" height="50" viewBox={AXLINE_LOGO_VIEWBOX} width="50" xmlns="http://www.w3.org/2000/svg" {...svgProps}>
			<path d={AXLINE_LOGO_PATH} fill={fillColor} />
		</svg>
	)
}
export default ClineLogoSanta
