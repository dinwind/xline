import * as fs from "fs/promises"
import { resolveUserSecretsCandidates } from "./axline-dir"

export type AxlineSecrets = {
	updateEnrollmentCode?: string
}

export class AxlineSecretsError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "AxlineSecretsError"
	}
}

/**
 * Loads ~/.axline/secrets.json (or legacy ~/.cline/secrets.json).
 * Returns null when no secrets file exists.
 */
export async function loadAxlineSecrets(): Promise<AxlineSecrets | null> {
	for (const secretsPath of resolveUserSecretsCandidates()) {
		try {
			await fs.access(secretsPath)
		} catch {
			continue
		}

		const fileContent = await fs.readFile(secretsPath, "utf8")
		let data: unknown
		try {
			data = JSON.parse(fileContent)
		} catch (parseError) {
			throw new AxlineSecretsError(
				`Invalid JSON in secrets file (${secretsPath}): ${parseError instanceof Error ? parseError.message : String(parseError)}`,
			)
		}

		return parseAxlineSecrets(data, secretsPath)
	}

	return null
}

function parseAxlineSecrets(data: unknown, filePath: string): AxlineSecrets {
	if (Array.isArray(data)) {
		throw new AxlineSecretsError(`Secrets file (${filePath}) must contain a JSON object`)
	}
	if (typeof data !== "object" || data === null) {
		throw new AxlineSecretsError(`Secrets file (${filePath}) must contain a JSON object`)
	}

	const obj = data as Record<string, unknown>
	const updateEnrollmentCode = obj.updateEnrollmentCode
	if (updateEnrollmentCode === undefined) {
		return {}
	}
	if (typeof updateEnrollmentCode !== "string" || !updateEnrollmentCode.trim()) {
		throw new AxlineSecretsError(`Field "updateEnrollmentCode" in secrets file (${filePath}) must be a non-empty string`)
	}

	return { updateEnrollmentCode }
}
