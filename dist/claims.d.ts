export interface Claim {
    id: string;
    type: "behavior" | "test" | "quality" | "compatibility" | "documentation" | "unknown";
    statement: string;
    source: string;
    requiredEvidence: string[];
}
export declare function loadClaims(path: string): Promise<Claim[]>;
export declare function normalizeMarkdown(text: string, source?: string): Claim[];
