import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import type { IsolationMode, Severity } from "./model.js";
import { showFile } from "./git.js";

export interface N0Config {
  version: 1;
  base: { strategy: "merge-base" | "direct"; ref?: string | undefined };
  execution: {
    mode: IsolationMode;
    network: boolean;
    timeoutSeconds: number;
    maxMemoryMb: number;
    maxCpu: number;
    containerImage?: string | undefined;
  };
  commands: {
    install?: string | undefined;
    build?: string | undefined;
    lint?: string | undefined;
    typecheck?: string | undefined;
    test?: string | undefined;
    coverage?: string | undefined;
  };
  policies: {
    blockOn: string[];
    warnOn: string[];
    criticalPaths: string[];
    minimumSeverity: Severity;
  };
  matrix: { enabled: boolean };
  negativeControl: { enabled: boolean; maxMutants: number; changedLinesOnly: boolean };
  report: { html: boolean; json: boolean; sarif: boolean; sign: boolean };
  adapters: { javascript: boolean; python: boolean };
}

export const defaultConfig: N0Config = {
  version: 1,
  base: { strategy: "merge-base" },
  execution: {
    mode: "audit",
    network: false,
    timeoutSeconds: 120,
    maxMemoryMb: 4096,
    maxCpu: 2,
  },
  commands: {},
  policies: {
    blockOn: [
      "test_file_deleted",
      "test_skip_added",
      "focused_test_added",
      "test_failure_masked",
      "assertion_weakened",
      "non_discriminating_test",
      "mandatory_requirement_failed",
    ],
    warnOn: ["test_case_removed", "assertion_removed", "empty_suite_allowed", "coverage_reduced"],
    criticalPaths: ["src/auth/**", "src/payment/**", ".github/workflows/**"],
    minimumSeverity: "info",
  },
  matrix: { enabled: true },
  negativeControl: { enabled: true, maxMutants: 10, changedLinesOnly: true },
  report: { html: true, json: true, sarif: true, sign: false },
  adapters: { javascript: true, python: true },
};

export interface LoadedConfig {
  config: N0Config;
  source: string;
  trusted: boolean;
}

export async function loadTrustedConfig(repository: string, base: string): Promise<LoadedConfig> {
  for (const path of [".n0/n0.config.yml", ".n0/n0.config.yaml"]) {
    try {
      const text = await showFile(repository, base, path);
      return { config: normalizeConfig(parse(text)), source: `${base}:${path}`, trusted: true };
    } catch {
      // Try the next trusted path.
    }
  }
  for (const path of [join(repository, ".n0", "n0.config.yml"), join(repository, ".n0", "n0.config.yaml")]) {
    try {
      const text = await readFile(path, "utf8");
      return { config: normalizeConfig(parse(text)), source: path, trusted: false };
    } catch {
      // Try the next local path.
    }
  }
  return { config: structuredClone(defaultConfig), source: "built-in defaults", trusted: true };
}

export function normalizeConfig(value: unknown): N0Config {
  if (value !== undefined && (typeof value !== "object" || value === null || Array.isArray(value))) {
    throw new Error("N0 configuration must be a YAML mapping.");
  }
  const input = (value ?? {}) as Record<string, unknown>;
  if (input.version !== undefined && input.version !== 1) throw new Error("Unsupported N0 configuration version.");
  const base = asRecord(input.base);
  const execution = asRecord(input.execution);
  const commands = asRecord(input.commands);
  const policies = asRecord(input.policies);
  const matrix = asRecord(input.matrix);
  const negative = asRecord(input.negative_control ?? input.negativeControl);
  const report = asRecord(input.report);
  const adapters = asRecord(input.adapters);
  const mode = oneOf(execution.mode, ["audit", "worktree", "container"] as const, defaultConfig.execution.mode);
  return {
    version: 1,
    base: {
      strategy: oneOf(base.strategy, ["merge-base", "direct"] as const, defaultConfig.base.strategy),
      ...(typeof base.ref === "string" ? { ref: base.ref } : {}),
    },
    execution: {
      mode,
      network: booleanValue(execution.network, defaultConfig.execution.network),
      timeoutSeconds: numberValue(execution.timeout_seconds ?? execution.timeoutSeconds, 120),
      maxMemoryMb: numberValue(execution.max_memory_mb ?? execution.maxMemoryMb, 4096),
      maxCpu: numberValue(execution.max_cpu ?? execution.maxCpu, 2),
      ...(typeof execution.container_image === "string" ? { containerImage: execution.container_image } : {}),
    },
    commands: {
      ...stringEntry(commands, "install"),
      ...stringEntry(commands, "build"),
      ...stringEntry(commands, "lint"),
      ...stringEntry(commands, "typecheck"),
      ...stringEntry(commands, "test"),
      ...stringEntry(commands, "coverage"),
    },
    policies: {
      blockOn: stringArray(policies.block_on ?? policies.blockOn, defaultConfig.policies.blockOn),
      warnOn: stringArray(policies.warn_on ?? policies.warnOn, defaultConfig.policies.warnOn),
      criticalPaths: stringArray(policies.critical_paths ?? policies.criticalPaths, defaultConfig.policies.criticalPaths),
      minimumSeverity: typeof policies.minimum_severity === "string"
        ? policies.minimum_severity as Severity
        : defaultConfig.policies.minimumSeverity,
    },
    matrix: { enabled: booleanValue(matrix.enabled, true) },
    negativeControl: {
      enabled: booleanValue(negative.enabled, true),
      maxMutants: numberValue(negative.max_mutants ?? negative.maxMutants, 10),
      changedLinesOnly: booleanValue(negative.changed_lines_only ?? negative.changedLinesOnly, true),
    },
    report: {
      html: booleanValue(report.html, true),
      json: booleanValue(report.json, true),
      sarif: booleanValue(report.sarif, true),
      sign: booleanValue(report.sign, false),
    },
    adapters: {
      javascript: booleanValue(adapters.javascript, true),
      python: booleanValue(adapters.python, true),
    },
  };
}

export function serializeConfig(config: N0Config): string {
  return stringify(config, { lineWidth: 100 });
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function booleanValue(value: unknown, fallback: boolean): boolean { return typeof value === "boolean" ? value : fallback; }
function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}
function stringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? [...value] : [...fallback];
}
function stringEntry(record: Record<string, unknown>, key: string): Record<string, string> {
  return typeof record[key] === "string" ? { [key]: record[key] } : {};
}
function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
}
