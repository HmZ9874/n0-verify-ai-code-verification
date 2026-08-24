import type { Finding } from "./model.js";
export interface Waiver {
    rule: string;
    path?: string | undefined;
    reason: string;
    approvedBy: string;
    expires: string;
}
export declare function loadTrustedWaivers(repository: string, base: string): Promise<Waiver[]>;
export declare function applyWaivers(findings: Finding[], waivers: Waiver[], now?: Date): void;
