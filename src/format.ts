import type { DemoCase, } from "./demo.js";
import type { Finding, VerificationResult } from "./model.js";

const color = {
  red: (value: string) => `\u001b[31m${value}\u001b[0m`,
  yellow: (value: string) => `\u001b[33m${value}\u001b[0m`,
  green: (value: string) => `\u001b[32m${value}\u001b[0m`,
  dim: (value: string) => `\u001b[2m${value}\u001b[0m`,
};

export function formatVerification(result: VerificationResult): string {
  const lines = [
    "N0 VERIFY",
    `Decision: ${paintDecision(result.decision)}`,
    `Evidence: ${result.evidenceStatus}`,
    `Base: ${result.base.slice(0, 12)}`,
    `Head: ${result.head.slice(0, 12)}`,
    "",
  ];
  if (result.findings.length === 0) {
    lines.push("No policy findings.");
  } else {
    lines.push(...result.findings.map(formatFinding));
  }
  lines.push("", color.dim(result.counterfactual.summary));
  return lines.join("\n");
}

export function formatDemo(cases: DemoCase[]): string {
  const lines = ["N0 VERIFY — controlled evidence demo", ""];
  for (const item of cases) {
    lines.push(`${paintDecision(item.decision)}  ${item.name}`);
    for (const finding of item.findings) lines.push(`  ${formatFinding(finding)}`);
    lines.push("");
  }
  lines.push("Five controlled repository changes were analyzed without an API key.");
  return lines.join("\n");
}

function formatFinding(finding: Finding): string {
  const location = finding.path ? ` ${finding.path}${finding.line ? `:${finding.line}` : ""}` : "";
  return `${finding.ruleId}${location} — ${finding.message}`;
}

function paintDecision(decision: "PASS" | "WARN" | "BLOCK"): string {
  if (!process.stdout.isTTY || process.env.NO_COLOR) return decision;
  if (decision === "BLOCK") return color.red(decision);
  if (decision === "WARN") return color.yellow(decision);
  return color.green(decision);
}
