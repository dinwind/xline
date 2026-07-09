export function isClineProvider(provider: string | undefined) {
	return provider === "cline" || provider === "cline-pass"
}

export function isAxgateProvider(provider: string | undefined) {
	return provider === "axgate"
}

export function usesAxlineGatewayAuth(provider: string | undefined) {
	return isAxgateProvider(provider) || isClineProvider(provider)
}
