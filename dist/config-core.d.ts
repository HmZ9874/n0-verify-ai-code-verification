import type { IsolationMode, Severity } from "./model.js";
export interface N0Config {
    version: 1;
    base: {
        strategy: "merge-base" | "direct";
        ref?: string | undefined;
    };
    execution: {
        mode: IsolationMode;
        network: boolean;
        timeoutSeconds: number;
        maxMemoryMb: number;
        maxCpu: number;
        containerImage?: string | undefined;
    };
    commands: {
        install?: string | undefined;
        build?: string | undefined;
        lint?: string | undefined;
        typecheck?: string | undefined;
        test?: string | undefined;
        coverage?: string | undefined;
    };
    policies: {
        blockOn: string[];
        warnOn: string[];
        criticalPaths: string[];
        minimumSeverity: Severity;
    };
    matrix: {
        enabled: boolean;
    };
    negativeControl: {
        enabled: boolean;
        maxMutants: number;
        changedLinesOnly: boolean;
    };
    report: {
        html: boolean;
        json: boolean;
        sarif: boolean;
        sign: boolean;
    };
    adapters: {
        javascript: boolean;
        python: boolean;
    };
}
export declare const defaultConfig: N0Config;
export interface LoadedConfig {
    config: N0Config;
    source: string;
    trusted: boolean;
}
export declare function loadTrustedConfig(repository: string, base: string): Promise<LoadedConfig>;
export declare function normalizeConfig(value: unknown): N0Config;
export declare function serializeConfig(config: N0Config): string;
