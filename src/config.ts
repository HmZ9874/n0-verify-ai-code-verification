import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse, stringify } from "yaml";
import { loadTrustedConfig as loadProjectConfig, normalizeConfig as normalizeCore } from "./config-core.js";
import type { LoadedConfig, N0Config } from "./config-core.js";

export { defaultConfig } from "./config-core.js";
export type { LoadedConfig, N0Config } from "./config-core.js";

export async function loadTrustedConfig(repository: string, base: string): Promise<LoadedConfig> {
  const organizationPolicy = process.env.N0_ORG_POLICY;
  if (organizationPolicy) {
    const path = resolve(organizationPolicy);
    return { config: normalizeConfig(parse(await readFile(path, "utf8"))), source: `organization:${path}`, trusted: true };
  }
  const loaded = await loadProjectConfig(repository, base);
  return { ...loaded, config: normalizeConfig(loaded.config) };
}

export function normalizeConfig(value: unknown): N0Config {
  validateConfigShape(value);
  return normalizeCore(value);
}

export function serializeConfig(config: N0Config): string {
  return stringify({
    version: config.version, base: config.base,
    execution: { mode: config.execution.mode, network: config.execution.network, timeout_seconds: config.execution.timeoutSeconds, max_memory_mb: config.execution.maxMemoryMb, max_cpu: config.execution.maxCpu, ...(config.execution.containerImage ? { container_image: config.execution.containerImage } : {}) },
    commands: config.commands,
    policies: { block_on: config.policies.blockOn, warn_on: config.policies.warnOn, critical_paths: config.policies.criticalPaths, minimum_severity: config.policies.minimumSeverity },
    matrix: config.matrix,
    negative_control: { enabled: config.negativeControl.enabled, max_mutants: config.negativeControl.maxMutants, changed_lines_only: config.negativeControl.changedLinesOnly },
    report: config.report, adapters: config.adapters,
  }, { lineWidth: 100 });
}

function validateConfigShape(value: unknown): void {
  if (value === undefined) return;
  if (!isRecord(value)) throw new Error("N0 configuration must be a YAML mapping.");
  if (value.version !== undefined && value.version !== 1) throw new Error("Unsupported N0 configuration version.");
  const execution = isRecord(value.execution) ? value.execution : {};
  if (execution.mode !== undefined && !["audit", "worktree", "container"].includes(String(execution.mode))) throw new Error("execution.mode must be audit, worktree, or container.");
  for (const key of ["timeout_seconds", "timeoutSeconds", "max_memory_mb", "maxMemoryMb", "max_cpu", "maxCpu"]) {
    if (execution[key] !== undefined && (typeof execution[key] !== "number" || !Number.isFinite(execution[key]) || Number(execution[key]) < 0)) throw new Error(`execution.${key} must be a non-negative number.`);
  }
  const commands = isRecord(value.commands) ? value.commands : {};
  for (const [key, command] of Object.entries(commands)) if (command !== undefined && typeof command !== "string") throw new Error(`commands.${key} must be a string.`);
  const policies = isRecord(value.policies) ? value.policies : {};
  for (const key of ["block_on", "blockOn", "warn_on", "warnOn", "critical_paths", "criticalPaths"]) {
    if (policies[key] !== undefined && (!Array.isArray(policies[key]) || !(policies[key] as unknown[]).every((item) => typeof item === "string"))) throw new Error(`policies.${key} must be an array of strings.`);
  }
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
