export type AxlineUpdateConfig = {
	authNexusBaseUrl: string
	updateAppId: string
	updateEnrollmentCode: string
}

export type AuthNexusAppToken = {
	accessToken: string
	expiresAtMs: number
	appId: string
}

export type SoftwareReleaseInfo = {
	version: string
	downloadUrl: string
	fileHash?: string
	fileSize?: number
	releaseNotes?: string
	mandatory?: boolean
}

export type UpdateCheckResult =
	| { status: "disabled" }
	| { status: "up_to_date"; currentVersion: string }
	| { status: "update_available"; currentVersion: string; release: SoftwareReleaseInfo }
	| { status: "error"; message: string }
