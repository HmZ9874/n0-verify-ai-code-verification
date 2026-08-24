import type { ChangedFile, CounterfactualResult } from "./model.js";
export declare function runCounterfactual(options: {
    repository: string;
    base: string;
    head: string;
    files: ChangedFile[];
    testCommand?: string;
    timeoutMs?: number;
}): Promise<CounterfactualResult>;
