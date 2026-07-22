import { existsSync } from "node:fs"
import { join } from "node:path"

const FORBIDDEN_PACKAGE_PATHS = ["endpoints.json", "secrets.json"]

export function assertPublishPreflight(vscodeDir) {
	const violations = FORBIDDEN_PACKAGE_PATHS.filter((name) => existsSync(join(vscodeDir, name)))
	if (violations.length > 0) {
		throw new Error(
			`Refusing to package: found ${violations.join(", ")} under apps/vscode/. ` +
				"Move secrets to ~/.axline/secrets.json and public endpoints to ~/.axline/endpoints.json before release.",
		)
	}
}
