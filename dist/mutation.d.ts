import type { ChangedFile } from "./model.js";
import type { CommandPlan } from "./adapters.js";
import type { N0Config } from "./config.js";
export interface MutationResult {
    id: string;
    path: string;
    line: number;
    operator: string;
    status: "KILLED" | "SURVIVED" | "TIMEOUT" | "INVALID" | "ERROR";
    durationMs: number;
}
export declare function runChangedLineMutations(options: {
    repository: string;
    head: string;
    patch: string;
    files: ChangedFile[];
    plan: CommandPlan;
    config: N0Config;
}): Promise<MutationResult[]>;
