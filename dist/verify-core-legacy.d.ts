import type { VerificationResult } from "./model.js";
export interface VerifyOptions {
    cwd: string;
    base?: string | undefined;
    head?: string | undefined;
    testCommand?: string | undefined;
    timeoutMs?: number | undefined;
    mode?: "audit" | "worktree" | "container" | undefined;
    writeProof?: boolean | undefined;
    proofOutput?: string | undefined;
    signingKey?: string | undefined;
}
export declare function verifyRepository(options: VerifyOptions): Promise<VerificationResult>;
