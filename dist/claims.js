import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { parse } from "yaml";
export async function loadClaims(path) {
    const text = await readFile(path, "utf8");
    const extension = extname(path).toLowerCase();
    if (extension === ".json")
        return normalizeStructured(JSON.parse(text), path);
    if (extension === ".yml" || extension === ".yaml")
        return normalizeStructured(parse(text), path);
    return normalizeMarkdown(text, path);
}
export function normalizeMarkdown(text, source = "markdown") {
    const statements = text.split(/\r?\n/u).map((line) => line.trim()).filter((line) => /^[-*+]\s+|^\d+\.\s+|^- \[[ xX]\]\s+/u.test(line)).map((line) => line.replace(/^[-*+]\s+(?:\[[ xX]\]\s*)?|^\d+\.\s+/u, "").trim()).filter(Boolean);
    return statements.map((statement, index) => claimFromStatement(statement, source, index));
}
function normalizeStructured(value, source) {
    const root = value;
    const items = Array.isArray(root) ? root : Array.isArray(root.claims) ? root.claims : [];
    return items.map((item, index) => {
        if (typeof item === "string")
            return claimFromStatement(item, source, index);
        const record = item;
        const statement = typeof record.statement === "string" ? record.statement : typeof record.claim === "string" ? record.claim : "Unspecified claim";
        const inferred = claimFromStatement(statement, source, index);
        return { ...inferred, ...(typeof record.id === "string" ? { id: record.id } : {}), ...(typeof record.type === "string" && ["behavior", "test", "quality", "compatibility", "documentation", "unknown"].includes(record.type) ? { type: record.type } : {}), ...(Array.isArray(record.required_evidence) ? { requiredEvidence: record.required_evidence.filter((entry) => typeof entry === "string") } : {}) };
    });
}
function claimFromStatement(statement, source, index) {
    const lower = statement.toLowerCase();
    const type = /all .*tests? .*pass|build .*pass|lint .*pass|typecheck .*pass/u.test(lower) ? "quality" : /test|coverage/u.test(lower) ? "test" : /document|readme/u.test(lower) ? "documentation" : /no breaking|compatible/u.test(lower) ? "compatibility" : /implement|fix|reject|return|support|handle/u.test(lower) ? "behavior" : "unknown";
    const requiredEvidence = type === "test" ? ["test_diff", "negative_test"] : type === "quality" ? ["clean_test_run"] : type === "documentation" ? ["file_change"] : type === "compatibility" ? ["regression_test"] : type === "behavior" ? ["runtime_test"] : [];
    return { id: `CLAIM-${String(index + 1).padStart(3, "0")}`, type, statement, source, requiredEvidence };
}
//# sourceMappingURL=claims.js.map