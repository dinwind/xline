import { useCallback } from "react"
import { useClineAuth } from "@/context/ClineAuthContext"
import { useExtensionState } from "@/context/ExtensionStateContext"

/**
 * When AxGate auth is enabled, chat and model usage require a signed-in user.
 * Returns helpers to check login requirement and redirect to the account view.
 */
export function useAxgateLoginGate() {
	const { clineUser } = useClineAuth()
	const { axgateAuthEnabled, navigateToAccount } = useExtensionState()

	const requiresLogin = axgateAuthEnabled && !clineUser?.uid

	const promptLogin = useCallback(() => {
		navigateToAccount()
	}, [navigateToAccount])

	return {
		requiresLogin,
		promptLogin,
	}
}
