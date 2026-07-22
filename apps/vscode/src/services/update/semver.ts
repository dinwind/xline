/**
 * Compare two dotted numeric semver strings (major.minor.patch).
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 */
export function compareSemver(a: string, b: string): number {
	const pa = parseSemverParts(a)
	const pb = parseSemverParts(b)
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const da = pa[i] ?? 0
		const db = pb[i] ?? 0
		if (da > db) {
			return 1
		}
		if (da < db) {
			return -1
		}
	}
	return 0
}

function parseSemverParts(version: string): number[] {
	const core = version.trim().split("-")[0]?.split("+")[0] ?? version
	return core.split(".").map((part) => {
		const n = Number.parseInt(part, 10)
		return Number.isFinite(n) ? n : 0
	})
}
