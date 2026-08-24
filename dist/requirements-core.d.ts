import type { ChangedFile, EvidenceNode, MatrixResult, RequirementDefinition, RequirementResult, SnapshotRun } from "./model.js";
export declare function loadRequirements(repository: string, base: string): Promise<RequirementDefinition[]>;
export declare function evaluateRequirements(options: {
    definitions: RequirementDefinition[];
    changedFiles: ChangedFile[];
    runs: SnapshotRun[];
    matrix?: MatrixResult | undefined;
}): {
    results: RequirementResult[];
    evidence: EvidenceNode[];
};
