import { detectIntegrityFindings as detectCore } from "./detectors-core.js";
import { parseDiffLines } from "./diff.js";
import type { ChangedFile, Finding } from "./model.js";

export function detectIntegrityFindings(patch: string, files: ChangedFile[]): Finding[] {
  const findings = detectCore(patch, files);
  const lines = parseDiffLines(patch);
  const removed = lines.filter((line) => line.kind === "removed");
  for (const added of lines.filter((line) => line.kind === "added")) {
    const current = threshold(added.content);
    if (!current) continue;
    const previousLine = removed.find((line) => line.path === added.path && threshold(line.content)?.key === current.key);
    const previous = previousLine ? threshold(previousLine.content) : undefined;
    if (previous && current.value < previous.value) findings.push({
      ruleId: "N0-COV-001", kind: "coverage_reduced", severity: "blocking",
      path: added.path, line: added.line,
      message: `Coverage ${current.key} threshold decreased from ${previous.value} to ${current.value}.`,
      evidence: `${previousLine?.content.trim()} -> ${added.content.trim()}`,
    });
  }
  return deduplicate(findings);
}

function threshold(content: string): { key: string; value: number } | undefined {
  const match = /\b(threshold|branches|functions|lines|statements)\b[^\d]*(\d+(?:\.\d+)?)/iu.exec(content);
  return match?.[1] && match[2] ? { key: match[1].toLowerCase(), value: Number(match[2]) } : undefined;
}
function deduplicate(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => { const key = `${finding.ruleId}:${finding.path ?? ""}:${finding.line ?? ""}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
