import { describe, expect, it } from "bun:test"
import {
	AXGATE_CLIENT_NAME,
	AXGATE_HEADER_CLIENT_NAME,
	AXGATE_HEADER_CLIENT_VERSION,
	AXGATE_HEADER_DEVICE_TOKEN,
	AXGATE_HEADER_INSTALLATION_ID,
	buildAxgateClientHeaders,
	isValidInstallationId,
} from "./axgate"

describe("axgate client identity", () => {
	it("validates RFC 4122 UUID v4 installation IDs", () => {
		expect(isValidInstallationId("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
		expect(isValidInstallationId("not-a-uuid")).toBe(false)
		expect(isValidInstallationId("550e8400-e29b-51d4-a716-446655440000")).toBe(false)
	})

	it("builds required AxGate client headers", () => {
		const headers = buildAxgateClientHeaders({
			clientName: AXGATE_CLIENT_NAME,
			clientVersion: "0.2.0",
			installationId: "550e8400-e29b-41d4-a716-446655440000",
		})

		expect(headers.get(AXGATE_HEADER_CLIENT_NAME)).toBe("axline-vscode")
		expect(headers.get(AXGATE_HEADER_CLIENT_VERSION)).toBe("0.2.0")
		expect(headers.get(AXGATE_HEADER_INSTALLATION_ID)).toBe("550e8400-e29b-41d4-a716-446655440000")
		expect(headers.has(AXGATE_HEADER_DEVICE_TOKEN)).toBe(false)
	})

	it("includes device token header when provided", () => {
		const headers = buildAxgateClientHeaders({
			clientName: AXGATE_CLIENT_NAME,
			clientVersion: "0.2.0",
			installationId: "550e8400-e29b-41d4-a716-446655440000",
			deviceToken: "device-token-value",
		})

		expect(headers.get(AXGATE_HEADER_DEVICE_TOKEN)).toBe("device-token-value")
	})

	it("merges base headers without overwriting client identity", () => {
		const headers = buildAxgateClientHeaders(
			{
				clientName: AXGATE_CLIENT_NAME,
				clientVersion: "0.2.0",
				installationId: "550e8400-e29b-41d4-a716-446655440000",
			},
			{
				Authorization: "Bearer jwt",
				"X-Custom": "keep-me",
			},
		)

		expect(headers.get("Authorization")).toBe("Bearer jwt")
		expect(headers.get("X-Custom")).toBe("keep-me")
		expect(headers.get(AXGATE_HEADER_CLIENT_NAME)).toBe("axline-vscode")
	})
})
