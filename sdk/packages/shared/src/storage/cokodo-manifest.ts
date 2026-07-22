import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
	DEFAULT_INSTRUCTION_SYSTEM,
	type InstructionSystem,
} from "./instruction-system";
import { AGENT_PROTOCOL_DIR } from "./paths";

export const COKODO_MANIFEST_FILE_NAME = "manifest.json";
export const COKODO_MCP_SERVER_NAME = "cokodo-agent";
/** Sentinel in `autoApprove` meaning every tool on this server is approved. */
export const MCP_AUTO_APPROVE_ALL_TOOLS = "*";
export const COKODO_MCP_SNIPPET_REL_PATH = join(
	"adapters",
	"cline",
	"mcp-snippet.json",
);

const CLINE_RULES_DIR = ".clinerules";
const CLINE_CONFIG_DIR = ".cline";

export interface CokodoManifestLayer {
	files?: string[];
	options?: Record<string, string[]>;
	mappings?: Record<string, string[]>;
	modules?: Record<
		string,
		{
			entry?: string;
			files?: string[];
		}
	>;
}

export interface CokodoManifest {
	loading_strategy?: {
		layers?: Record<string, CokodoManifestLayer>;
		task_profiles?: Record<
			string,
			{
				workflows?: string[];
				skills?: string[];
			}
		>;
	};
}

export interface CokodoMcpServerConfig {
	command: string;
	args?: string[];
	cwd?: string;
	env?: Record<string, string>;
	disabled?: boolean;
	autoApprove?: string[];
}

function dedupePaths(paths: ReadonlyArray<string>): string[] {
	const seen = new Set<string>();
	const deduped: string[] = [];
	for (const candidate of paths) {
		if (!candidate || seen.has(candidate)) {
			continue;
		}
		seen.add(candidate);
		deduped.push(candidate);
	}
	return deduped;
}

function parseManifest(raw: unknown): CokodoManifest | null {
	if (typeof raw !== "object" || raw === null) {
		return null;
	}
	return raw as CokodoManifest;
}

export function getAgentProtocolRoot(workspacePath: string): string {
	return join(workspacePath, AGENT_PROTOCOL_DIR);
}

export function getCokodoManifestPath(workspacePath: string): string {
	return join(getAgentProtocolRoot(workspacePath), COKODO_MANIFEST_FILE_NAME);
}

export function loadCokodoManifest(
	workspacePath?: string,
): CokodoManifest | null {
	if (!workspacePath) {
		return null;
	}
	const manifestPath = getCokodoManifestPath(workspacePath);
	if (!existsSync(manifestPath)) {
		return null;
	}
	try {
		const raw = JSON.parse(readFileSync(manifestPath, "utf-8")) as unknown;
		return parseManifest(raw);
	} catch {
		return null;
	}
}

export function hasCokodoAgentProtocol(workspacePath?: string): boolean {
	if (!workspacePath) {
		return false;
	}
	const agentRoot = getAgentProtocolRoot(workspacePath);
	return (
		existsSync(getCokodoManifestPath(workspacePath)) ||
		existsSync(agentRoot)
	);
}

export function workspaceHasClineInstructions(workspacePath: string): boolean {
	return (
		existsSync(join(workspacePath, CLINE_RULES_DIR)) ||
		existsSync(join(workspacePath, CLINE_CONFIG_DIR))
	);
}

export function detectInstructionSystemForWorkspace(
	workspacePath?: string,
): InstructionSystem {
	if (!workspacePath) {
		return DEFAULT_INSTRUCTION_SYSTEM;
	}
	const hasAgent = hasCokodoAgentProtocol(workspacePath);
	const hasCline = workspaceHasClineInstructions(workspacePath);
	if (hasAgent && hasCline) {
		return "both";
	}
	if (hasAgent) {
		return "cokodo";
	}
	if (hasCline) {
		return "cline";
	}
	return DEFAULT_INSTRUCTION_SYSTEM;
}

function collectLayerFilePaths(layer: CokodoManifestLayer | undefined): string[] {
	if (!layer) {
		return [];
	}
	const files = [...(layer.files ?? [])];
	for (const optionFiles of Object.values(layer.options ?? {})) {
		files.push(...optionFiles);
	}
	for (const mappingFiles of Object.values(layer.mappings ?? {})) {
		files.push(...mappingFiles);
	}
	for (const module of Object.values(layer.modules ?? {})) {
		if (module.entry) {
			files.push(module.entry);
		}
		files.push(...(module.files ?? []));
	}
	return files;
}

export function collectManifestFilePaths(manifest: CokodoManifest): string[] {
	const layers = manifest.loading_strategy?.layers ?? {};
	const files = [
		...collectLayerFilePaths(layers.essential),
		...collectLayerFilePaths(layers.context),
		...collectLayerFilePaths(layers.stack_specs),
		...collectLayerFilePaths(layers.workflows),
		...collectLayerFilePaths(layers.skills),
		...collectLayerFilePaths(layers.reference),
	];
	return dedupePaths(files);
}

function directoriesFromManifestFiles(
	workspacePath: string,
	filePaths: ReadonlyArray<string>,
): string[] {
	const agentRoot = getAgentProtocolRoot(workspacePath);
	const directories = [agentRoot];
	for (const relPath of filePaths) {
		directories.push(dirname(join(agentRoot, relPath)));
	}
	return dedupePaths(directories);
}

const FALLBACK_COKODO_RULES_DIRS = ["", "core", "project", "meta"] as const;

export function resolveManifestContextSearchPaths(
	workspacePath: string,
	manifest: CokodoManifest | null = loadCokodoManifest(workspacePath),
): string[] {
	const agentRoot = getAgentProtocolRoot(workspacePath);
	if (!manifest) {
		return FALLBACK_COKODO_RULES_DIRS.map((segment) =>
			segment ? join(agentRoot, segment) : agentRoot,
		);
	}
	return directoriesFromManifestFiles(
		workspacePath,
		collectManifestFilePaths(manifest),
	);
}

export function resolveManifestWorkflowSearchPaths(
	workspacePath: string,
	manifest: CokodoManifest | null = loadCokodoManifest(workspacePath),
): string[] {
	const agentRoot = getAgentProtocolRoot(workspacePath);
	if (!manifest) {
		return [
			join(agentRoot, "core", "workflows"),
			join(agentRoot, "project", "sop"),
		];
	}
	const workflowFiles = collectLayerFilePaths(
		manifest.loading_strategy?.layers?.workflows,
	);
	return dedupePaths([
		join(agentRoot, "core", "workflows"),
		join(agentRoot, "project", "sop"),
		...directoriesFromManifestFiles(workspacePath, workflowFiles),
	]);
}

export function resolveManifestSkillDirectories(
	workspacePath: string,
	manifest: CokodoManifest | null = loadCokodoManifest(workspacePath),
): string[] {
	const agentRoot = getAgentProtocolRoot(workspacePath);
	// Protocol skills live under skills/<name>; project-owned skills under skills/_project/<name>
	// (cokodo lint skills-placement). Both must be scanned so the model can use_skill them.
	const directories = [
		join(agentRoot, "skills"),
		join(agentRoot, "skills", "_project"),
	];
	const modules = manifest?.loading_strategy?.layers?.skills?.modules ?? {};
	for (const module of Object.values(modules)) {
		if (module.entry) {
			directories.push(dirname(join(agentRoot, module.entry)));
		}
		for (const relPath of module.files ?? []) {
			directories.push(dirname(join(agentRoot, relPath)));
		}
	}
	return dedupePaths(directories);
}

export function getDefaultCokodoMcpServerEntry(): CokodoMcpServerConfig {
	return {
		command: "co",
		args: ["serve", "--shared-launcher"],
		disabled: false,
		autoApprove: [MCP_AUTO_APPROVE_ALL_TOOLS],
	};
}

/**
 * Resolve the cokodo MCP launch config for a workspace, injecting the absolute
 * project root into shared-launcher args and COKODO_PROJECT_ROOT env (matches
 * Cursor `.cursor/mcp.json` behavior).
 */
export function resolveCokodoMcpServerEntryForWorkspace(
	workspacePath: string,
): CokodoMcpServerConfig | null {
	const base = loadCokodoMcpServerEntry(workspacePath);
	if (!base) {
		return null;
	}

	const args = [...(base.args ?? ["serve", "--shared-launcher"])];
	const launcherIndex = args.indexOf("--shared-launcher");
	if (launcherIndex >= 0) {
		args.splice(launcherIndex + 1);
		args.push(workspacePath);
	} else {
		args.push("--shared-launcher", workspacePath);
	}

	const autoApprove =
		base.autoApprove === undefined || base.autoApprove.length === 0
			? [MCP_AUTO_APPROVE_ALL_TOOLS]
			: base.autoApprove;

	return {
		...base,
		args,
		env: {
			...(base.env ?? {}),
			COKODO_PROJECT_ROOT: workspacePath,
		},
		autoApprove,
	};
}

function parseMcpServerEntry(value: unknown): CokodoMcpServerConfig | null {
	if (typeof value !== "object" || value === null) {
		return null;
	}
	const entry = value as Record<string, unknown>;
	if (typeof entry.command !== "string" || !entry.command.trim()) {
		return null;
	}
	const parsed: CokodoMcpServerConfig = {
		command: entry.command,
	};
	if (Array.isArray(entry.args)) {
		parsed.args = entry.args.filter(
			(arg): arg is string => typeof arg === "string",
		);
	}
	if (typeof entry.disabled === "boolean") {
		parsed.disabled = entry.disabled;
	}
	if (Array.isArray(entry.autoApprove)) {
		parsed.autoApprove = entry.autoApprove.filter(
			(item): item is string => typeof item === "string",
		);
	}
	if (typeof entry.cwd === "string" && entry.cwd.trim()) {
		parsed.cwd = entry.cwd;
	}
	if (typeof entry.env === "object" && entry.env !== null && !Array.isArray(entry.env)) {
		const env: Record<string, string> = {};
		for (const [key, value] of Object.entries(entry.env)) {
			if (typeof value === "string") {
				env[key] = value;
			}
		}
		if (Object.keys(env).length > 0) {
			parsed.env = env;
		}
	}
	return parsed;
}

export function loadCokodoMcpServerEntry(
	workspacePath?: string,
): CokodoMcpServerConfig | null {
	if (!workspacePath || !hasCokodoAgentProtocol(workspacePath)) {
		return null;
	}
	const snippetPath = join(
		getAgentProtocolRoot(workspacePath),
		COKODO_MCP_SNIPPET_REL_PATH,
	);
	if (existsSync(snippetPath)) {
		try {
			const snippet = JSON.parse(readFileSync(snippetPath, "utf-8")) as {
				mcpServers?: Record<string, unknown>;
			};
			const entry = snippet.mcpServers?.[COKODO_MCP_SERVER_NAME];
			const parsed = parseMcpServerEntry(entry);
			if (parsed) {
				return parsed;
			}
		} catch {
			// Fall through to bundled default.
		}
	}
	return getDefaultCokodoMcpServerEntry();
}
