export const AXGATE_DEVICE_ERROR_CODES = [
	"DEVICE_REQUIRED",
	"DEVICE_PENDING",
	"DEVICE_REVOKED",
	"DEVICE_CREDENTIAL_INVALID",
	"DEVICE_ALREADY_REGISTERED",
	"DEVICE_QUOTA_EXCEEDED",
	"CLIENT_VERSION_UNSUPPORTED",
	"CLIENT_IDENTITY_INVALID",
] as const

export type AxgateDeviceErrorCode = (typeof AXGATE_DEVICE_ERROR_CODES)[number]

export type AxgateStructuredError = {
	code?: string
	message?: string
	minimumVersion?: string
}

export class AxgateRequestError extends Error {
	readonly status: number
	readonly code?: string
	readonly minimumVersion?: string

	constructor(message: string, status: number, code?: string, minimumVersion?: string) {
		super(message)
		this.name = "AxgateRequestError"
		this.status = status
		this.code = code
		this.minimumVersion = minimumVersion
	}
}

export function isAxgateRequestError(error: unknown): error is AxgateRequestError {
	return error instanceof AxgateRequestError
}

export function parseAxgateStructuredError(body: unknown): AxgateStructuredError | null {
	if (!body || typeof body !== "object") {
		return null
	}

	const record = body as Record<string, unknown>
	const detail = record.detail

	if (typeof detail === "string") {
		return { message: detail }
	}

	if (detail && typeof detail === "object") {
		const detailRecord = detail as Record<string, unknown>
		return {
			code: typeof detailRecord.code === "string" ? detailRecord.code : undefined,
			message:
				typeof detailRecord.message === "string"
					? detailRecord.message
					: typeof record.message === "string"
						? record.message
						: undefined,
			minimumVersion:
				typeof detailRecord.minimumVersion === "string" ? detailRecord.minimumVersion : undefined,
		}
	}

	if (typeof record.message === "string") {
		return { message: record.message }
	}

	return null
}

export function isAxgateDeviceErrorCode(code?: string): code is AxgateDeviceErrorCode {
	return !!code && (AXGATE_DEVICE_ERROR_CODES as readonly string[]).includes(code)
}

export function shouldDeauthForAxgateError(code?: string, status?: number): boolean {
	if (isAxgateDeviceErrorCode(code)) {
		return false
	}
	if (status === 426) {
		return false
	}
	if (status === 429 && code === "DEVICE_QUOTA_EXCEEDED") {
		return false
	}
	return status === 401
}

export function getAxgateDeviceErrorMessage(code?: string, details?: AxgateStructuredError): string | undefined {
	switch (code) {
		case "DEVICE_PENDING":
			return "This Axline installation is waiting for administrator approval."
		case "DEVICE_REVOKED":
			return "Device access for this Axline installation has been revoked."
		case "DEVICE_REQUIRED":
			return "This Axline installation must complete device registration before calling AxGate."
		case "DEVICE_CREDENTIAL_INVALID":
			return "The local device credential is invalid. Re-register this installation or contact an administrator."
		case "DEVICE_QUOTA_EXCEEDED":
			return "Device quota for this installation has been exhausted."
		case "CLIENT_VERSION_UNSUPPORTED":
			return details?.minimumVersion
				? `Axline ${details.minimumVersion} or newer is required to use AxGate.`
				: "This Axline version is no longer supported by AxGate."
		case "CLIENT_IDENTITY_INVALID":
			return "AxGate rejected the client identity headers sent by Axline."
		default:
			return details?.message
	}
}

export async function parseAxgateErrorResponse(response: Response): Promise<AxgateRequestError> {
	let structured: AxgateStructuredError | null = null
	try {
		structured = parseAxgateStructuredError(await response.json())
	} catch {
		structured = null
	}

	const message =
		getAxgateDeviceErrorMessage(structured?.code, structured ?? undefined) ||
		structured?.message ||
		response.statusText ||
		"Request failed"

	return new AxgateRequestError(message, response.status, structured?.code, structured?.minimumVersion)
}
