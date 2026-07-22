import { describe, expect, it } from "bun:test"
import {
	getAxgateDeviceErrorMessage,
	isAxgateDeviceErrorCode,
	parseAxgateStructuredError,
	shouldDeauthForAxgateError,
} from "./axgate-errors"

describe("axgate-errors", () => {
	it("parses structured AxGate error bodies", () => {
		expect(
			parseAxgateStructuredError({
				detail: {
					code: "DEVICE_PENDING",
					message: "Device pending approval",
				},
			}),
		).toEqual({
			code: "DEVICE_PENDING",
			message: "Device pending approval",
		})
	})

	it("maps device error codes to user-facing messages", () => {
		expect(getAxgateDeviceErrorMessage("DEVICE_PENDING")).toContain("administrator approval")
		expect(getAxgateDeviceErrorMessage("CLIENT_VERSION_UNSUPPORTED", { minimumVersion: "0.3.0" })).toContain("0.3.0")
	})

	it("does not deauth for device or version gate errors", () => {
		expect(shouldDeauthForAxgateError("DEVICE_PENDING", 403)).toBe(false)
		expect(shouldDeauthForAxgateError("CLIENT_VERSION_UNSUPPORTED", 426)).toBe(false)
		expect(shouldDeauthForAxgateError(undefined, 401)).toBe(true)
	})

	it("recognizes AxGate device error codes", () => {
		expect(isAxgateDeviceErrorCode("DEVICE_REVOKED")).toBe(true)
		expect(isAxgateDeviceErrorCode("NOT_A_DEVICE_CODE")).toBe(false)
	})
})
