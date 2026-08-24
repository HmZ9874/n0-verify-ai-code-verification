import type { Claim } from "./claims.js";
import type { MutationResult } from "./mutation.js";

declare module "./model.js" {
  interface VerificationResult {
    claims?: Claim[] | undefined;
    mutations?: MutationResult[] | undefined;
  }
  interface RequirementResult {
    mandatory?: boolean | undefined;
  }
}

export {};
