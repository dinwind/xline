import { SVGProps } from "react"
import { AXLINE_LOGO_PATH, AXLINE_LOGO_VIEWBOX } from "./axlineLogoPath"

const ClineLogoWhite = (props: SVGProps<SVGSVGElement>) => (
	<svg fill="none" height="50" viewBox={AXLINE_LOGO_VIEWBOX} width="50" xmlns="http://www.w3.org/2000/svg" {...props}>
		<path d={AXLINE_LOGO_PATH} fill="white" />
	</svg>
)
export default ClineLogoWhite
