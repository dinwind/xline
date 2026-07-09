import type { OAuthCredentials } from "./types";
import { decodeJwtPayload, isCredentialLikelyExpired } from "./utils";

const DEFAULT_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const DEFAULT_HTTP_TIMEOUT_MS = 30_000;

export const AXGATE_TOKEN_PREFIX = "axgate:";

/** AuthNexus app ID for Axline IDE (distinct from axgate Console `app_TyG8vaxz`). */
export const DEFAULT_AXLINE_AUTH_APP_ID = "app_uu1Sn7yC";

export type AxgateAuthConfig = {
	baseUrl: string;
	appId: string;
};

export type AxgateLoginInput = AxgateAuthConfig & {
	username: string;
	password: string;
};

export type AxgateRefreshInput = AxgateAuthConfig & {
	accessToken: string;
};

export type AxgateTokenResolution = {
	forceRefresh?: boolean;
	refreshBufferMs?: number;
};

type AxgateLoginResponse = {
	access_token?: string;
	token?: string;
	expires_in?: number;
};

type AxgateSessionPrincipal = {
	subject: string;
	roles: string[];
	app_ids?: string[];
	raw_claims?: Record<string, unknown>;
};

export type AxgateSessionResponse = {
	principal: AxgateSessionPrincipal | null;
	service?: string;
	version?: string;
};

function normalizeBaseUrl(value: string): string {
	return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function stripAxgateTokenPrefix(accessToken: string): string {
	const token = accessToken.trim();
	return token.toLowerCase().startsWith(AXGATE_TOKEN_PREFIX)
		? token.slice(AXGATE_TOKEN_PREFIX.length)
		: token;
}

export function formatAxgateApiKey(accessToken: string): string {
	const token = stripAxgateTokenPrefix(accessToken);
	return token;
}

function resolveExpiryFromJwt(accessToken: string, expiresIn?: number): number {
	const payload = decodeJwtPayload(accessToken);
	const exp = payload?.exp;
	if (typeof exp === "number" && exp > 0) {
		return exp * 1000;
	}
	if (typeof expiresIn === "number" && expiresIn > 0) {
		return Date.now() + expiresIn * 1000;
	}
	return Date.now() + 3600 * 1000;
}

function parseAccessToken(response: AxgateLoginResponse): string {
	const token = response.access_token?.trim() || response.token?.trim();
	if (!token) {
		throw new Error("AxGate login response did not include an access token");
	}
	return token;
}

async function parseErrorMessage(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as {
			detail?: string | { message?: string; code?: string };
			message?: string;
		};
		if (typeof body.detail === "string") {
			return body.detail;
		}
		if (body.detail && typeof body.detail === "object") {
			return body.detail.message || body.detail.code || response.statusText;
		}
		return body.message || response.statusText;
	} catch {
		return response.statusText || "Request failed";
	}
}

export async function loginAxgate(input: AxgateLoginInput): Promise<OAuthCredentials> {
	const url = `${normalizeBaseUrl(input.baseUrl)}/api/auth/login`;
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			username: input.username,
			password: input.password,
			appId: input.appId,
		}),
		signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
	});

	if (!response.ok) {
		throw new Error(await parseErrorMessage(response));
	}

	const data = (await response.json()) as AxgateLoginResponse;
	const access = parseAccessToken(data);
	return {
		access,
		refresh: access,
		expires: resolveExpiryFromJwt(access, data.expires_in),
	};
}

export async function refreshAxgateSession(
	input: AxgateRefreshInput,
): Promise<OAuthCredentials> {
	const url = `${normalizeBaseUrl(input.baseUrl)}/api/auth/session/refresh`;
	const token = stripAxgateTokenPrefix(input.accessToken);
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ appId: input.appId }),
		signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
	});

	if (!response.ok) {
		throw new Error(await parseErrorMessage(response));
	}

	const data = (await response.json()) as AxgateLoginResponse;
	const access = parseAccessToken(data);
	return {
		access,
		refresh: access,
		expires: resolveExpiryFromJwt(access, data.expires_in),
	};
}

export async function fetchAxgateSession(
	config: AxgateAuthConfig,
	accessToken: string,
): Promise<AxgateSessionResponse> {
	const url = `${normalizeBaseUrl(config.baseUrl)}/api/session/me`;
	const token = stripAxgateTokenPrefix(accessToken);
	const response = await fetch(url, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` },
		signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
	});

	if (!response.ok) {
		throw new Error(await parseErrorMessage(response));
	}

	return (await response.json()) as AxgateSessionResponse;
}

export async function getValidAxgateCredentials(
	credentials: OAuthCredentials,
	config: AxgateAuthConfig,
	options: AxgateTokenResolution = {},
): Promise<OAuthCredentials | null> {
	const refreshBufferMs = options.refreshBufferMs ?? DEFAULT_REFRESH_BUFFER_MS;
	const shouldRefresh =
		options.forceRefresh ||
		isCredentialLikelyExpired(credentials, refreshBufferMs);

	if (!shouldRefresh) {
		return credentials;
	}

	try {
		return await refreshAxgateSession({
			baseUrl: config.baseUrl,
			appId: config.appId,
			accessToken: credentials.access,
		});
	} catch {
		return null;
	}
}
