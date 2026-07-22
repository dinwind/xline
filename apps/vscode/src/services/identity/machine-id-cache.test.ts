import { afterEach, describe, it, mock } from "bun:test"
import { expect } from "chai"
import * as actualNodeMachineId from "node-machine-id"
import * as sinon from "sinon"

const machineIdStub: sinon.SinonStub = sinon.stub()
mock.module("node-machine-id", () => ({ ...actualNodeMachineId, machineId: machineIdStub }))

import { getSharedMachineId, resetSharedMachineIdCache } from "./machine-id-cache"

describe("machine-id-cache", () => {
	afterEach(() => {
		machineIdStub.reset()
		resetSharedMachineIdCache()
	})

	it("reads machineId only once per process", async () => {
		machineIdStub.resolves("machine-abc")

		const first = await getSharedMachineId()
		const second = await getSharedMachineId()

		expect(first).to.equal("machine-abc")
		expect(second).to.equal("machine-abc")
		expect(machineIdStub.calledOnce).to.be.true
	})
})
