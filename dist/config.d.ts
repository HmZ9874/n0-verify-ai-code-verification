import type { LoadedConfig, N0Config } from "./config-core.js";
export { defaultConfig } from "./config-core.js";
export type { LoadedConfig, N0Config } from "./config-core.js";
export declare function loadTrustedConfig(repository: string, base: string): Promise<LoadedConfig>;
export declare function normalizeConfig(value: unknown): N0Config;
export declare function serializeConfig(config: N0Config): string;
