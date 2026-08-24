import type { ChangedFile } from "./model.js";
export declare function repositoryRoot(cwd: string): Promise<string>;
export declare function resolveRef(cwd: string, ref: string): Promise<string>;
export declare function mergeBase(cwd: string, base: string, head: string): Promise<string>;
export declare function diffPatch(cwd: string, base: string, head: string): Promise<string>;
export declare function showFile(cwd: string, ref: string, path: string): Promise<string>;
export declare function changedFiles(cwd: string, base: string, head: string): Promise<ChangedFile[]>;
export declare function classifyFile(path: string): ChangedFile["category"];
