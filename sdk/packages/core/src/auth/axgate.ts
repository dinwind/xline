import type { OAuthCredentials } from "./types";
import { parseAxgateErrorResponse } from "./axgate-errors";
import { decodeJwtPayload, isCredentialLikelyExpired } from "./utils";

const DEFAULT_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const DEFAULT_HTTP_TIMEOUT_MS = 30_000;

export const AXGATE_TOKEN_PREFIX = "axgate:";

/** Canonical Axline VS Code client name for AxGate device identity headers. */
export const AXGATE_CLIENT_NAME = "axline-vscode" as const;

export const AXGATE_HEADER_CLIENT_NAME = "X-AxGate-Client-Name";
export const AXGATE_HEADER_CLIENT_VERSION = "X-AxGate-Client-Version";
export const AXGATE_HEADER_INSTALLATION_ID = "X-AxGate-Installation-Id";
export const AXGATE_HEADER_DEVICE_TOKEN = "X-AxGate-Device-Token";
/** Axline plan / act / auto chat mode for AxGate auto-routing (`mode_models`). */
export const AXGATE_HEADER_AGENT_MODE = "X-AxGate-Agent-Mode";

export type AxgateAgentMode = "auto" | "plan" | "act";
export type AxgateSessionMode = "plan" | "act";

const AXGATE_AUTO_ROUTING_MODEL_IDS = new Set(["auto", "ax_auto"]);

export function isAxgateAutoRoutingModel(modelId: string | undefined): boolean {
	const normalized = modelId?.trim().toLowerCase();
	return !normalized || AXGATE_AUTO_ROUTING_MODEL_IDS.has(normalized);
}

/** Map Axline session mode + model id to AxGate `agent_mode` for routing and audit. */
export function resolveAxgateAgentMode(
	sessionMode: AxgateSessionMode,
	modelId: string | undefined,
): AxgateAgentMode {
	if (sessionMode === "plan") {
		return "plan";
	}
	if (isAxgateAutoRoutingModel(modelId)) {
		return "auto";
	}
	return "act";
}

export type AxgateClientIdentity = {
	clientName: typeof AXGATE_CLIENT_NAME;
	clientVersion: string;
	installationId: string;
	deviceToken?: string;
};

export type AxgateDeviceStatus = "pending" | "active" | "revoked";

export type AxgateDeviceEnrollResponse = {
	installationId: string;
	status: AxgateDeviceStatus;
	deviceToken?: string;
};

export type AxgateDeviceMeResponse = {
	installationId: string;
	status: AxgateDeviceStatus;
	clientName?: string;
	lastSeenVersion?: string;
	minimumVersion?: string;
	deviceEnforcement?: string;
	versionEnforcement?: string;
};

const UUID_V4_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidInstallationId(value: string | undefined): value is string {
	return typeof value === "string" && UUID_V4_PATTERN.test(value.trim());
}

/** Node-safe headers init (avoid DOM-only `HeadersInit` in @cline/core). */
export type AxgateHeadersInit = ConstructorParameters<typeof Headers>[0]

export function buildAxgateClientHeaders(
	identity: AxgateClientIdentity,
	base?: AxgateHeadersInit,
): Headers {
	const headers = new Headers(base);
	headers.set(AXGATE_HEADER_CLIENT_NAME, identity.clientName.slice(0, 64));
	headers.set(AXGATE_HEADER_CLIENT_VERSION, identity.clientVersion.trim());
	headers.set(AXGATE_HEADER_INSTALLATION_ID, identity.installationId.trim());
	const deviceToken = identity.deviceToken?.trim();
	if (deviceToken) {
		headers.set(AXGATE_HEADER_DEVICE_TOKEN, deviceToken);
	}
	return headers;
}

function mergeAxgateClientHeaders(
	identity: AxgateClientIdentity | undefined,
	init?: RequestInit,
): RequestInit {
	if (!identity) {
		return init ?? {};
	}

	return {
		...init,
		headers: buildAxgateClientHeaders(identity, init?.headers),
	};
}

/** AuthNexus app ID for Axline IDE (distinct from axgate Console `app_TyG8vaxz`). */
export const DEFAULT_AXLINE_AUTH_APP_ID = "app_uu1Sn7yC";

export type AxgateAuthConfig = {
	baseUrl: string;
	appId: string;
};

export type AxgateLoginInput = AxgateAuthConfig & {
	username: string;
	password: string;
	clientIdentity?: AxgateClientIdentity;
};

export type AxgateRefreshInput = AxgateAuthConfig & {
	accessToken: string;
	clientIdentity?: AxgateClientIdentity;
};

export type AxgateAuthenticatedRequestInput = AxgateAuthConfig & {
	accessToken: string;
	clientIdentity?: AxgateClientIdentity;
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

export { parseAxgateErrorResponse } from "./axgate-errors";
export {
	AXGATE_DEVICE_ERROR_CODES,
	AxgateRequestError,
	getAxgateDeviceErrorMessage,
	isAxgateDeviceErrorCode,
	isAxgateRequestError,
	parseAxgateStructuredError,
	shouldDeauthForAxgateError,
	type AxgateDeviceErrorCode,
	type AxgateStructuredError,
} from "./axgate-errors";

export async function loginAxgate(input: AxgateLoginInput): Promise<OAuthCredentials> {
	const url = `${normalizeBaseUrl(input.baseUrl)}/api/auth/login`;
	const response = await fetch(
		url,
		mergeAxgateClientHeaders(input.clientIdentity, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				username: input.username,
				password: input.password,
				appId: input.appId,
			}),
			signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
		}),
	);

	if (!response.ok) {
		throw await parseAxgateErrorResponse(response);
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
	const response = await fetch(
		url,
		mergeAxgateClientHeaders(input.clientIdentity, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ appId: input.appId }),
			signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
		}),
	);

	if (!response.ok) {
		throw await parseAxgateErrorResponse(response);
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
	clientIdentity?: AxgateClientIdentity,
): Promise<AxgateSessionResponse> {
	const url = `${normalizeBaseUrl(config.baseUrl)}/api/session/me`;
	const token = stripAxgateTokenPrefix(accessToken);
	const response = await fetch(
		url,
		mergeAxgateClientHeaders(clientIdentity, {
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
		}),
	);

	if (!response.ok) {
		throw await parseAxgateErrorResponse(response);
	}

	return (await response.json()) as AxgateSessionResponse;
}

export async function enrollAxgateDevice(
	input: AxgateAuthenticatedRequestInput,
): Promise<AxgateDeviceEnrollResponse> {
	if (!input.clientIdentity) {
		throw new Error("AxGate device enrollment requires client identity headers");
	}

	const url = `${normalizeBaseUrl(input.baseUrl)}/api/devices/enroll`;
	const token = stripAxgateTokenPrefix(input.accessToken);
	const response = await fetch(
		url,
		mergeAxgateClientHeaders(input.clientIdentity, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
		}),
	);

	if (!response.ok) {
		throw await parseAxgateErrorResponse(response);
	}

	return (await response.json()) as AxgateDeviceEnrollResponse;
}

export async function fetchAxgateDeviceMe(
	input: AxgateAuthenticatedRequestInput,
): Promise<AxgateDeviceMeResponse> {
	if (!input.clientIdentity) {
		throw new Error("AxGate device status requires client identity headers");
	}

	const url = `${normalizeBaseUrl(input.baseUrl)}/api/devices/me`;
	const token = stripAxgateTokenPrefix(input.accessToken);
	const response = await fetch(
		url,
		mergeAxgateClientHeaders(input.clientIdentity, {
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
		}),
	);

	if (!response.ok) {
		throw await parseAxgateErrorResponse(response);
	}

	return (await response.json()) as AxgateDeviceMeResponse;
}

export async function getValidAxgateCredentials(
	credentials: OAuthCredentials,
	config: AxgateAuthConfig,
	options: AxgateTokenResolution = {},
	clientIdentity?: AxgateClientIdentity,
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
			clientIdentity,
		});
	} catch {
		return null;
	}
}
