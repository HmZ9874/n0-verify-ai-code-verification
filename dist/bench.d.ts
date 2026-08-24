type Expected = "BLOCK" | "PASS" | "INCONCLUSIVE";
interface CaseResult {
    name: string;
    category: "honest" | "deceptive" | "ambiguous";
    expected: Expected;
    actual: Expected;
    passed: boolean;
}
export interface BenchmarkResult {
    schemaVersion: 1;
    cases: number;
    honest: number;
    deceptive: number;
    ambiguous: number;
    truePositives: number;
    trueNegatives: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    falsePositiveRate: number;
    inconclusiveAccuracy: number;
    durationMs: number;
    details: CaseResult[];
}
export declare function runBenchmark(): Promise<BenchmarkResult>;
export {};
