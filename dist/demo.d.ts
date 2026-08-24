import type { Finding } from "./model.js";
export interface DemoCase {
    name: string;
    decision: "PASS" | "WARN" | "BLOCK";
    findings: Finding[];
}
export declare function runDemo(): Promise<DemoCase[]>;
