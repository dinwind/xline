import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
	COKODO_MCP_SERVER_NAME,
	collectManifestFilePaths,
	detectInstructionSystemForWorkspace,
	loadCokodoManifest,
	loadCokodoMcpServerEntry,
	resolveManifestContextSearchPaths,
	resolveManifestSkillDirectories,
} from "./cokodo-manifest";

describe("cokodo manifest discovery", () => {
	let workspacePath = "";

	afterEach(() => {
		if (workspacePath) {
			rmSync(workspacePath, { recursive: true, force: true });
			workspacePath = "";
		}
	});

	function createWorkspace(): string {
		workspacePath = mkdtempSync(join(tmpdir(), "cokodo-manifest-"));
		return workspacePath;
	}

	it("detects cokodo instruction system when .agent exists", () => {
		const root = createWorkspace();
		mkdirSync(join(root, ".agent"), { recursive: true });
		expect(detectInstructionSystemForWorkspace(root)).toBe("cokodo");
	});

	it("detects both when .agent and .clinerules coexist", () => {
		const root = createWorkspace();
		mkdirSync(join(root, ".agent"), { recursive: true });
		mkdirSync(join(root, ".clinerules"), { recursive: true });
		expect(detectInstructionSystemForWorkspace(root)).toBe("both");
	});

	it("collects manifest layer files for context and skills", () => {
		const root = createWorkspace();
		const agentRoot = join(root, ".agent");
		mkdirSync(agentRoot, { recursive: true });
		writeFileSync(
			join(agentRoot, "manifest.json"),
			JSON.stringify({
				loading_strategy: {
					layers: {
						essential: { files: ["project/status.md"] },
						context: { files: ["project/context.md"] },
						skills: {
							modules: {
								guardian: { entry: "skills/guardian/SKILL.md" },
							},
						},
					},
				},
			}),
		);

		const manifest = loadCokodoManifest(root);
		expect(manifest).not.toBeNull();
		expect(collectManifestFilePaths(manifest!)).toEqual(
			expect.arrayContaining([
				"project/status.md",
				"project/context.md",
				"skills/guardian/SKILL.md",
			]),
		);

		const paths = resolveManifestContextSearchPaths(root);
		expect(paths).toEqual(
			expect.arrayContaining([
				agentRoot,
				join(agentRoot, "project"),
			]),
		);

		const skillDirs = resolveManifestSkillDirectories(root);
		expect(skillDirs).toEqual(
			expect.arrayContaining([
				join(agentRoot, "skills"),
				join(agentRoot, "skills", "_project"),
				join(agentRoot, "skills", "guardian"),
			]),
		);
	});

	it("loads MCP server entry from adapter snippet with default fallback", () => {
		const root = createWorkspace();
		const agentRoot = join(root, ".agent");
		const snippetDir = join(agentRoot, "adapters", "cline");
		mkdirSync(snippetDir, { recursive: true });
		writeFileSync(
			join(snippetDir, "mcp-snippet.json"),
			JSON.stringify({
				mcpServers: {
					[COKODO_MCP_SERVER_NAME]: {
						command: "co",
						args: ["serve", "--shared-launcher"],
						disabled: false,
						autoApprove: ["*"],
					},
				},
			}),
		);

		expect(loadCokodoMcpServerEntry(root)).toEqual({
			command: "co",
			args: ["serve", "--shared-launcher"],
			disabled: false,
			autoApprove: ["*"],
		});
	});
});
