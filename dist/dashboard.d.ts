export interface RunSummary {
    runId: string;
    decision: string;
    evidenceStatus: string;
    base: string;
    head: string;
    generatedAt: string;
    findings: number;
}
export declare function listProofRuns(repository: string): Promise<RunSummary[]>;
