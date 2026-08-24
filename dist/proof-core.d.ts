import "./extensions.js";
import type { VerificationResult } from "./model.js";
import type { N0Config } from "./config.js";
export interface ProofManifest {
    schemaVersion: "1.0";
    runId: string;
    baseCommit: string;
    headCommit: string;
    startedAt: string;
    isolationMode: string;
    policyHash: string;
    proofHash: string;
    files: Record<string, string>;
}
export declare function produceProofPack(options: {
    result: VerificationResult;
    config: N0Config;
    outputRoot?: string | undefined;
    signingKey?: string | undefined;
}): Promise<{
    directory: string;
    manifest: ProofManifest;
}>;
export declare function verifyProofPack(directory: string): Promise<{
    valid: boolean;
    errors: string[];
}>;
export declare function canonicalJson(value: unknown): string;
