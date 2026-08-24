import { verifyProofPack, canonicalJson } from "./proof-core.js";
import type { VerificationResult } from "./model.js";
import type { N0Config } from "./config.js";
export { verifyProofPack, canonicalJson };
export type { ProofManifest } from "./proof-core.js";
export declare function produceProofPack(options: {
    result: VerificationResult;
    config: N0Config;
    outputRoot?: string | undefined;
    signingKey?: string | undefined;
}): Promise<{
    directory: string;
    manifest: import("./proof-core.js").ProofManifest;
}>;
export declare function renderBadge(decision: VerificationResult["decision"]): string;
