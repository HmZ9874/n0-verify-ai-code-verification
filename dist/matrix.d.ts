import type { ChangedFile, MatrixResult } from "./model.js";
import type { CommandPlan } from "./adapters.js";
import type { N0Config } from "./config.js";
export declare function runFourWayMatrix(options: {
    repository: string;
    base: string;
    head: string;
    files: ChangedFile[];
    plan: CommandPlan;
    config: N0Config;
}): Promise<MatrixResult>;
