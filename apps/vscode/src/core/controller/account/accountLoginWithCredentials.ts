import { AccountLoginRequest } from "@shared/proto/cline/account"
import { String } from "@shared/proto/cline/common"
import { AuthService } from "@/sdk/auth-service"
import { Controller } from "../index"

export async function accountLoginWithCredentials(_controller: Controller, request: AccountLoginRequest): Promise<String> {
	return AuthService.getInstance().loginWithCredentials(request.username, request.password)
}
