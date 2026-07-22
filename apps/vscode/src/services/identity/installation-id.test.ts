import { afterEach, beforeEach, describe, it } from "bun:test"
import { expect } from "chai"
import * as sinon from "sinon"
import { StorageContext } from "@/shared/storage"
import {
	AXLINE_INSTALLATION_ID_KEY,
	deriveInstallationIdFromMachineId,
	getInstallationId,
	initializeInstallationId,
	isValidInstallationId,
	setInstallationId,
} from "./installation-id"

describe("installation-id", () => {
	let sandbox: sinon.SinonSandbox
	let mockStorage: StorageContext
	let mockGlobalState: {
		get: sinon.SinonStub
		update: sinon.SinonStub
	}

	const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000"
	const GENERATED_UUID = "123e4567-e89b-12d3-a456-426614174000"
	const MACHINE_ID = "test-machine-id-abc123"
	const mockUuidGenerator = () => GENERATED_UUID
	const mockMachineIdReader = async () => MACHINE_ID

	beforeEach(() => {
		sandbox = sinon.createSandbox()
		mockGlobalState = {
			get: sandbox.stub(),
			update: sandbox.stub(),
		}
		mockStorage = {
			globalState: mockGlobalState,
		} as unknown as StorageContext
		setInstallationId("")
	})

	afterEach(() => {
		sandbox.restore()
		setInstallationId("")
	})

	it("reuses a valid persisted installation ID", async () => {
		mockGlobalState.get.withArgs(AXLINE_INSTALLATION_ID_KEY).returns(VALID_UUID)

		const installationId = await initializeInstallationId(mockStorage, mockUuidGenerator, mockMachineIdReader)

		expect(installationId).to.equal(VALID_UUID)
		expect(getInstallationId()).to.equal(VALID_UUID)
		expect(mockGlobalState.update.called).to.be.false
	})

	it("derives a stable machine-based ID when missing", async () => {
		mockGlobalState.get.withArgs(AXLINE_INSTALLATION_ID_KEY).returns(undefined)
		const expected = deriveInstallationIdFromMachineId(MACHINE_ID)

		const installationId = await initializeInstallationId(mockStorage, mockUuidGenerator, mockMachineIdReader)

		expect(installationId).to.equal(expected)
		expect(isValidInstallationId(installationId)).to.be.true
		expect(mockGlobalState.update.calledWith(AXLINE_INSTALLATION_ID_KEY, expected)).to.be.true
	})

	it("derives the same installation ID for the same machine ID", () => {
		const first = deriveInstallationIdFromMachineId(MACHINE_ID)
		const second = deriveInstallationIdFromMachineId(MACHINE_ID)

		expect(first).to.equal(second)
		expect(isValidInstallationId(first)).to.be.true
	})

	it("falls back to a generated UUID when machine ID is unavailable", async () => {
		mockGlobalState.get.withArgs(AXLINE_INSTALLATION_ID_KEY).returns(undefined)

		const installationId = await initializeInstallationId(mockStorage, mockUuidGenerator, async () => "")

		expect(installationId).to.equal(GENERATED_UUID)
		expect(isValidInstallationId(installationId)).to.be.true
		expect(mockGlobalState.update.calledWith(AXLINE_INSTALLATION_ID_KEY, GENERATED_UUID)).to.be.true
	})

	it("replaces invalid persisted values with a machine-based ID", async () => {
		mockGlobalState.get.withArgs(AXLINE_INSTALLATION_ID_KEY).returns("invalid-id")
		const expected = deriveInstallationIdFromMachineId(MACHINE_ID)

		const installationId = await initializeInstallationId(mockStorage, mockUuidGenerator, mockMachineIdReader)

		expect(installationId).to.equal(expected)
		expect(mockGlobalState.update.calledWith(AXLINE_INSTALLATION_ID_KEY, expected)).to.be.true
	})
})
