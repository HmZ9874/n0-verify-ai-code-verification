import "./extensions.js";
import { type VerifyOptions as CoreVerifyOptions } from "./verify-core.js";
import type { VerificationResult } from "./model.js";
export interface VerifyOptions extends CoreVerifyOptions {
    claimsPath?: string | undefined;
}
export declare function verifyRepository(options: VerifyOptions): Promise<VerificationResult>;
