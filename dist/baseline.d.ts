import type { TestInventory } from "./model.js";
export interface BaselineRecord {
    schemaVersion: 1;
    commit: string;
    createdAt: string;
    inventory?: TestInventory | undefined;
    knownFailures: string[];
    warnings: string[];
}
export declare function createBaseline(repository: string, inventory?: TestInventory): Promise<BaselineRecord>;
export declare function inspectBaseline(repository: string): Promise<BaselineRecord>;
