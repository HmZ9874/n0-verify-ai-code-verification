import "./extensions.js";
import { evaluateRequirements as evaluateCore, loadRequirements } from "./requirements-core.js";
import type { ChangedFile, MatrixResult, RequirementDefinition, SnapshotRun } from "./model.js";

export { loadRequirements };

export function evaluateRequirements(options: { definitions: RequirementDefinition[]; changedFiles: ChangedFile[]; runs: SnapshotRun[]; matrix?: MatrixResult | undefined }) {
  const evaluation = evaluateCore(options);
  for (const result of evaluation.results) {
    const definition = options.definitions.find((item) => item.id === result.id);
    result.mandatory = definition?.mandatory ?? true;
    if (definition?.evidence.includes("file_change") && options.changedFiles.length === 0) {
      result.status = "UNVERIFIED";
      result.reason = "No repository change provides the required file-change evidence.";
      result.evidenceIds = result.evidenceIds.filter((id) => !id.endsWith("-DIFF"));
    }
  }
  return evaluation;
}
