import { fetchAxgateSession, getValidAxgateCredentials, loginAxgate, type OAuthCredentials } from "@cline/core"
import type { ClineAccountUserInfo, ClineAuthInfo } from "../auth-types"
import { configureAxgateProviderAfterLogin } from "./auto-config"
import { getAxgateConfig, toAxgateAuthConfig } from "./config"
import { clearAxgateCredentials, readAxgateCredentials, writeAxgateCredentials } from "./credentials"

function sessionToUserInfo(
	session: Awaited<ReturnType<typeof fetchAxgateSession>>,
	fallbackSubject?: string,
): ClineAccountUserInfo {
	const principal = session.principal
	const subject = principal?.subject || fallbackSubject || ""
	const rawClaims = principal?.raw_claims ?? {}
	const email =
		(typeof rawClaims.email === "string" && rawClaims.email) ||
		(typeof rawClaims.username === "string" && rawClaims.username) ||
		""
	const displayName =
		(typeof rawClaims.name === "string" && rawClaims.name) ||
		(typeof rawClaims.displayName === "string" && rawClaims.displayName) ||
		email ||
		subject

	return {
		id: subject,
		email,
		displayName,
		organizations: [],
		subject,
	}
}

function credentialsToAuthInfo(credentials: OAuthCredentials, userInfo: ClineAccountUserInfo): ClineAuthInfo {
	return {
		idToken: credentials.access,
		refreshToken: credentials.refresh,
		expiresAt: credentials.expires ? credentials.expires / 1000 : undefined,
		userInfo,
		provider: "axgate",
		startedAt: Date.now(),
	}
}

export async function axgateLoginWithCredentials(username: string, password: string): Promise<ClineAuthInfo> {
	const config = getAxgateConfig()
	if (!config) {
		throw new Error("AxGate is not configured. Set axgateBaseUrl in endpoints.json or AXLINE_AXGATE_BASE_URL.")
	}

	const credentials = await loginAxgate({
		...toAxgateAuthConfig(config),
		username,
		password,
	})

	const session = await fetchAxgateSession(toAxgateAuthConfig(config), credentials.access)
	const userInfo = sessionToUserInfo(session)
	const authInfo = credentialsToAuthInfo(credentials, userInfo)

	writeAxgateCredentials({
		accessToken: credentials.access,
		expiresAt: credentials.expires,
		accountId: userInfo.id,
	})
	await configureAxgateProviderAfterLogin(credentials.access)

	return authInfo
}

export async function axgateRestoreAuthInfo(): Promise<ClineAuthInfo | null> {
	const config = getAxgateConfig()
	const creds = readAxgateCredentials()
	if (!config || !creds) {
		return null
	}

	const restored: ClineAuthInfo = {
		idToken: creds.accessToken,
		refreshToken: creds.accessToken,
		expiresAt: creds.expiresAt ? creds.expiresAt / 1000 : undefined,
		userInfo: {
			id: creds.accountId ?? "",
			email: "",
			displayName: "",
			organizations: [],
		},
		provider: "axgate",
	}

	const valid = await getValidAxgateCredentials(
		{
			access: restored.idToken,
			refresh: restored.refreshToken ?? restored.idToken,
			expires: restored.expiresAt ? restored.expiresAt * 1000 : Date.now() + 3600_000,
		},
		{ baseUrl: config.baseUrl, appId: config.authAppId },
	)

	if (!valid) {
		clearAxgateCredentials()
		return null
	}

	writeAxgateCredentials({
		accessToken: valid.access,
		expiresAt: valid.expires,
		accountId: creds.accountId,
	})

	let userInfo = restored.userInfo
	try {
		const session = await fetchAxgateSession(toAxgateAuthConfig(config), valid.access)
		userInfo = sessionToUserInfo(session, creds.accountId)
	} catch {
		// Keep minimal profile if session lookup fails during restore.
	}

	return credentialsToAuthInfo(valid, userInfo)
}

export async function axgateRefreshAuthInfo(authInfo: ClineAuthInfo): Promise<ClineAuthInfo | null> {
	const config = getAxgateConfig()
	if (!config || !authInfo.idToken) {
		return null
	}

	const valid = await getValidAxgateCredentials(
		{
			access: authInfo.idToken,
			refresh: authInfo.refreshToken ?? authInfo.idToken,
			expires: authInfo.expiresAt ? authInfo.expiresAt * 1000 : Date.now(),
		},
		{ baseUrl: config.baseUrl, appId: config.authAppId },
		{ forceRefresh: true },
	)

	if (!valid) {
		clearAxgateCredentials()
		return null
	}

	writeAxgateCredentials({
		accessToken: valid.access,
		expiresAt: valid.expires,
		accountId: authInfo.userInfo.id,
	})

	let userInfo = authInfo.userInfo
	try {
		const session = await fetchAxgateSession(toAxgateAuthConfig(config), valid.access)
		userInfo = sessionToUserInfo(session, authInfo.userInfo.id)
	} catch {
		// Preserve previous profile on refresh failure.
	}

	return credentialsToAuthInfo(valid, userInfo)
}

export async function axgateFetchUserInfo(accessToken: string): Promise<ClineAccountUserInfo | null> {
	const config = getAxgateConfig()
	if (!config) {
		return null
	}

	try {
		const session = await fetchAxgateSession(toAxgateAuthConfig(config), accessToken)
		return sessionToUserInfo(session)
	} catch {
		return null
	}
}

export function axgateClearCredentials(): void {
	clearAxgateCredentials()
}

export function axgateGetBearerToken(accessToken: string): string {
	return accessToken
}

export async function axgateEnsureValidAuthInfo(authInfo: ClineAuthInfo): Promise<ClineAuthInfo | null> {
	const config = getAxgateConfig()
	if (!config) {
		return null
	}

	const expiresAt = authInfo.expiresAt
	if (expiresAt) {
		const currentTime = Date.now() / 1000
		const bufferSeconds = 5 * 60
		if (currentTime + bufferSeconds < expiresAt) {
			return authInfo
		}
	}

	return axgateRefreshAuthInfo(authInfo)
}
