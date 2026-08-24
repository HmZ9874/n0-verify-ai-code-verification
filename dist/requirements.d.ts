import "./extensions.js";
import { loadRequirements } from "./requirements-core.js";
import type { ChangedFile, MatrixResult, RequirementDefinition, SnapshotRun } from "./model.js";
export { loadRequirements };
export declare function evaluateRequirements(options: {
    definitions: RequirementDefinition[];
    changedFiles: ChangedFile[];
    runs: SnapshotRun[];
    matrix?: MatrixResult | undefined;
}): {
    results: import("./model.js").RequirementResult[];
    evidence: import("./model.js").EvidenceNode[];
};
