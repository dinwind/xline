export interface ClineAccountUserInfo {
	createdAt?: string
	displayName: string
	email: string
	id: string
	organizations: ClineAccountOrganization[]
	appBaseUrl?: string
	subject?: string
}

export interface ClineAccountOrganization {
	active: boolean
	memberId: string
	name: string
	organizationId: string
	roles: string[]
}

export interface ClineAuthInfo {
	idToken: string
	refreshToken?: string
	expiresAt?: number
	userInfo: ClineAccountUserInfo
	provider: string
	startedAt?: number
}
