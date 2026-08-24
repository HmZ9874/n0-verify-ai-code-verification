export interface CacheKeyInput {
    commit: string;
    lockfileHash: string;
    commandHash: string;
    environmentFingerprint: string;
    policyHash: string;
}
export declare function cacheKey(input: CacheKeyInput): string;
export declare class EvidenceCache {
    private readonly root;
    constructor(root: string);
    get<T>(trust: "base" | "candidate", key: string): Promise<T | undefined>;
    set<T>(trust: "base" | "candidate", key: string, value: T): Promise<void>;
}
