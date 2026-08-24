import type { TestInventory } from "./model.js";
import type { LanguageAdapter } from "./adapters.js";
export declare function inventoryTests(directory: string, adapter: LanguageAdapter): Promise<TestInventory>;
