import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { showFile } from "./git.js";
export const defaultConfig = {
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
export async function loadTrustedConfig(repository, base) {
    for (const path of [".n0/n0.config.yml", ".n0/n0.config.yaml"]) {
        try {
            const text = await showFile(repository, base, path);
            return { config: normalizeConfig(parse(text)), source: `${base}:${path}`, trusted: true };
        }
        catch {
            // Try the next trusted path.
        }
    }
    for (const path of [join(repository, ".n0", "n0.config.yml"), join(repository, ".n0", "n0.config.yaml")]) {
        try {
            const text = await readFile(path, "utf8");
            return { config: normalizeConfig(parse(text)), source: path, trusted: false };
        }
        catch {
            // Try the next local path.
        }
    }
    return { config: structuredClone(defaultConfig), source: "built-in defaults", trusted: true };
}
export function normalizeConfig(value) {
    if (value !== undefined && (typeof value !== "object" || value === null || Array.isArray(value))) {
        throw new Error("N0 configuration must be a YAML mapping.");
    }
    const input = (value ?? {});
    if (input.version !== undefined && input.version !== 1)
        throw new Error("Unsupported N0 configuration version.");
    const base = asRecord(input.base);
    const execution = asRecord(input.execution);
    const commands = asRecord(input.commands);
    const policies = asRecord(input.policies);
    const matrix = asRecord(input.matrix);
    const negative = asRecord(input.negative_control ?? input.negativeControl);
    const report = asRecord(input.report);
    const adapters = asRecord(input.adapters);
    const mode = oneOf(execution.mode, ["audit", "worktree", "container"], defaultConfig.execution.mode);
    return {
        version: 1,
        base: {
            strategy: oneOf(base.strategy, ["merge-base", "direct"], defaultConfig.base.strategy),
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
                ? policies.minimum_severity
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
export function serializeConfig(config) {
    return stringify(config, { lineWidth: 100 });
}
function asRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function booleanValue(value, fallback) { return typeof value === "boolean" ? value : fallback; }
function numberValue(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}
function stringArray(value, fallback) {
    return Array.isArray(value) && value.every((item) => typeof item === "string") ? [...value] : [...fallback];
}
function stringEntry(record, key) {
    return typeof record[key] === "string" ? { [key]: record[key] } : {};
}
function oneOf(value, allowed, fallback) {
    return typeof value === "string" && allowed.includes(value) ? value : fallback;
}
//# sourceMappingURL=config-core.js.map