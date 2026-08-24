import type { LanguageAdapter } from "./adapters.js";
import type { Finding, VerificationResult } from "./model.js";
import type { RemoteRunner } from "./remote-runner.js";
export interface DetectorPlugin {
    id: string;
    analyze(input: {
        repository: string;
        base: string;
        head: string;
        patch: string;
    }): Promise<Finding[]>;
}
export interface ReporterPlugin {
    id: string;
    write(result: VerificationResult, outputDirectory: string): Promise<string[]>;
}
export interface N0Plugin {
    name: string;
    version: string;
    adapters?: LanguageAdapter[] | undefined;
    detectors?: DetectorPlugin[] | undefined;
    reporters?: ReporterPlugin[] | undefined;
    runners?: RemoteRunner[] | undefined;
}
export declare function loadPlugin(path: string): Promise<N0Plugin>;
