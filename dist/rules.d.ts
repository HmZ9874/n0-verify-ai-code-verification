import type { Finding } from "./model.js";
export interface RuleDefinition {
    id: string;
    title: string;
    description: string;
    remediation: string;
    defaultSeverity: Finding["severity"];
}
export declare const ruleDefinitions: Record<string, RuleDefinition>;
export declare function explainRule(ruleId: string): RuleDefinition | undefined;
