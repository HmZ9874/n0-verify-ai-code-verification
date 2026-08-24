import type { SnapshotRun } from "./model.js";
import type { CommandPlan } from "./adapters.js";
import type { N0Config } from "./config.js";
export declare function executePlan(options: {
    directory: string;
    ref: string;
    snapshot: SnapshotRun["snapshot"];
    plan: CommandPlan;
    config: N0Config;
    testOnly?: boolean | undefined;
}): Promise<SnapshotRun>;
