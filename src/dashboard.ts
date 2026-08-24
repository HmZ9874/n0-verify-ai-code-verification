import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export interface RunSummary {
  runId: string;
  decision: string;
  evidenceStatus: string;
  base: string;
  head: string;
  generatedAt: string;
  findings: number;
}

export async function listProofRuns(repository: string): Promise<RunSummary[]> {
  const root = join(repository, ".n0", "runs");
  let entries;
  try { entries = await readdir(root, { withFileTypes: true }); } catch { return []; }
  const summaries = await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
    try {
      const proof = JSON.parse(await readFile(join(root, entry.name, "proof.json"), "utf8")) as Record<string, unknown>;
      return {
        runId: entry.name,
        decision: String(proof.decision ?? "UNKNOWN"), evidenceStatus: String(proof.evidenceStatus ?? "UNKNOWN"),
        base: String(proof.base ?? ""), head: String(proof.head ?? ""), generatedAt: String(proof.generatedAt ?? ""),
        findings: Array.isArray(proof.findings) ? proof.findings.length : 0,
      } satisfies RunSummary;
    } catch { return undefined; }
  }));
  return summaries.filter((item): item is RunSummary => item !== undefined).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}
