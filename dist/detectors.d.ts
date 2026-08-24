import type { ChangedFile, Finding } from "./model.js";
export declare function detectIntegrityFindings(patch: string, files: ChangedFile[]): Finding[];
