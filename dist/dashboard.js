import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
export async function listProofRuns(repository) {
    const root = join(repository, ".n0", "runs");
    let entries;
    try {
        entries = await readdir(root, { withFileTypes: true });
    }
    catch {
        return [];
    }
    const summaries = await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
        try {
            const proof = JSON.parse(await readFile(join(root, entry.name, "proof.json"), "utf8"));
            return {
                runId: entry.name,
                decision: String(proof.decision ?? "UNKNOWN"), evidenceStatus: String(proof.evidenceStatus ?? "UNKNOWN"),
                base: String(proof.base ?? ""), head: String(proof.head ?? ""), generatedAt: String(proof.generatedAt ?? ""),
                findings: Array.isArray(proof.findings) ? proof.findings.length : 0,
            };
        }
        catch {
            return undefined;
        }
    }));
    return summaries.filter((item) => item !== undefined).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}
//# sourceMappingURL=dashboard.js.map