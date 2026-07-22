import { Logger } from "@/shared/services/Logger"

type StartupMark = {
	scope: string
	phase: string
	deltaMs: number
	totalMs: number
	at: number
}

function isDebugHarnessCaptureEnabled(): boolean {
	return process.env.CLINE_CAPTURE_BROWSER === "1" || process.env.CLINE_CAPTURE_BROWSER === "true"
}

function recordStartupMark(scope: string, phase: string, deltaMs: number, totalMs: number): void {
	if (!isDebugHarnessCaptureEnabled()) {
		return
	}
	const g = globalThis as Record<string, unknown>
	if (!Array.isArray(g.__axlineStartupMarks)) {
		g.__axlineStartupMarks = []
	}
	;(g.__axlineStartupMarks as StartupMark[]).push({
		scope,
		phase,
		deltaMs,
		totalMs,
		at: performance.now(),
	})
}

/**
 * Lightweight phase timer for extension activation / initialize.
 * Logs each mark as `[Axline][startup] <phase>: <delta> ms (total <elapsed> ms)`.
 */
export class StartupTimer {
	private readonly start: number
	private last: number

	/**
	 * @param scope Logical scope name (e.g. `activate`, `initialize`)
	 * @param startedAt Optional wall-clock start so callers can include work done
	 *   before the logger was wired (e.g. HostProvider setup).
	 */
	constructor(
		private readonly scope: string,
		startedAt: number = performance.now(),
	) {
		this.start = startedAt
		this.last = startedAt
		Logger.log(`[Axline][startup] ${this.scope}: begin`)
		recordStartupMark(this.scope, "begin", 0, 0)
	}

	/** Record time since previous mark (or begin) for `phase`. */
	mark(phase: string): void {
		const now = performance.now()
		const deltaMs = now - this.last
		const totalMs = now - this.start
		this.last = now
		Logger.log(`[Axline][startup] ${this.scope}.${phase}: ${deltaMs.toFixed(1)} ms (total ${totalMs.toFixed(1)} ms)`)
		recordStartupMark(this.scope, phase, deltaMs, totalMs)
	}

	/** Final mark for the scope; returns total ms since begin. */
	finish(): number {
		const totalMs = performance.now() - this.start
		Logger.log(`[Axline][startup] ${this.scope}: done in ${totalMs.toFixed(1)} ms`)
		recordStartupMark(this.scope, "done", totalMs - (this.last - this.start), totalMs)
		return totalMs
	}
}
