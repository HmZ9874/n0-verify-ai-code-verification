import type { ChangedFile } from "./model.js";
import type { N0Config } from "./config.js";
export interface CommandPlan {
    adapter: string;
    packageManager?: string | undefined;
    install?: string | undefined;
    build?: string | undefined;
    lint?: string | undefined;
    typecheck?: string | undefined;
    test?: string | undefined;
    coverage?: string | undefined;
}
export interface LanguageAdapter {
    id: string;
    detect(directory: string): Promise<number>;
    discoverCommands(directory: string): Promise<CommandPlan>;
    isTestFile(path: string): boolean;
    isProductionFile(path: string): boolean;
}
export declare const javascriptAdapter: LanguageAdapter;
export declare const pythonAdapter: LanguageAdapter;
export declare const goAdapter: LanguageAdapter;
export declare const rustAdapter: LanguageAdapter;
export declare function detectAdapter(directory: string, config: N0Config, additional?: LanguageAdapter[]): Promise<LanguageAdapter | undefined>;
export declare function mergeCommandPlan(discovered: CommandPlan, configured: N0Config["commands"]): CommandPlan;
export declare function adapterForChangedFile(file: ChangedFile): "javascript" | "python" | "go" | "rust" | "unknown";
