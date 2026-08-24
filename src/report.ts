import type { Finding, VerificationResult } from "./model.js";

export function renderHtmlReport(result: VerificationResult): string {
  const color = result.decision === "BLOCK" ? "#dc2626" : result.decision === "WARN" ? "#d97706" : "#16a34a";
  const findings = result.findings.length
    ? result.findings.map((finding) => findingHtml(finding)).join("")
    : "<p class=empty>No policy findings.</p>";
  const requirements = result.requirements?.length
    ? `<table><thead><tr><th>Requirement</th><th>Status</th><th>Reason</th></tr></thead><tbody>${result.requirements.map((item) => `<tr><td><strong>${escapeHtml(item.id)}</strong><br>${escapeHtml(item.statement)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.reason)}</td></tr>`).join("")}</tbody></table>`
    : "<p class=empty>No requirements were configured.</p>";
  const matrix = result.matrix?.cells
    ? `<div class=matrix>${(["C0T0", "C1T0", "C0T1", "C1T1"] as const).map((key) => `<div><span>${key}</span><strong>${result.matrix?.cells[key]?.status ?? "NOT_RUN"}</strong></div>`).join("")}</div><p>${escapeHtml(result.matrix.interpretation)}</p>`
    : "<p class=empty>Matrix execution was not requested.</p>";
  return `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>N0 Verify — ${result.decision}</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#172033;background:#f5f7fb}body{margin:0}.wrap{max-width:1050px;margin:0 auto;padding:40px 24px}.hero,.panel{background:white;border:1px solid #e5e9f2;border-radius:16px;box-shadow:0 8px 30px #1720330d}.hero{padding:32px;border-top:7px solid ${color}}h1{margin:0 0 8px;letter-spacing:.08em}.verdict{font-size:42px;color:${color};font-weight:800}.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:24px}.meta div{background:#f7f8fb;padding:12px;border-radius:9px;overflow-wrap:anywhere}.panel{margin-top:20px;padding:24px}h2{margin-top:0}.finding{border-left:4px solid #d5dae5;padding:12px 16px;margin:12px 0;background:#fafbfc}.finding.blocking{border-color:#dc2626}.finding.warning{border-color:#d97706}code{white-space:pre-wrap}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:12px;border-bottom:1px solid #e7eaf0}.matrix{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.matrix div{padding:14px;background:#f7f8fb;border-radius:9px}.matrix span,.matrix strong{display:block}.empty{color:#697386}@media(max-width:650px){.matrix{grid-template-columns:repeat(2,1fr)}.verdict{font-size:32px}}
</style></head><body><main class=wrap><section class=hero><h1>N0 VERIFY</h1><div class=verdict>${result.decision}</div><p>Evidence status: <strong>${result.evidenceStatus}</strong></p><div class=meta><div><small>BASE</small><br>${escapeHtml(result.base)}</div><div><small>HEAD</small><br>${escapeHtml(result.head)}</div><div><small>POLICY</small><br>${escapeHtml(result.policySource ?? "defaults")}</div><div><small>ISOLATION</small><br>${escapeHtml(result.isolationMode ?? "audit")}</div></div></section><section class=panel><h2>Blocking findings and warnings</h2>${findings}</section><section class=panel><h2>Requirement evidence</h2>${requirements}</section><section class=panel><h2>Four-way matrix</h2>${matrix}</section><section class=panel><h2>Counterfactual</h2><p>${escapeHtml(result.counterfactual.summary)}</p></section><section class=panel><h2>Changed files</h2><table><thead><tr><th>Path</th><th>Status</th><th>Category</th></tr></thead><tbody>${result.changedFiles.map((file) => `<tr><td>${escapeHtml(file.path)}</td><td>${file.status}</td><td>${file.category}</td></tr>`).join("")}</tbody></table></section></main></body></html>`;
}

export function renderSarif(result: VerificationResult): object {
  const rules = [...new Map(result.findings.map((finding) => [finding.ruleId, {
    id: finding.ruleId,
    shortDescription: { text: finding.kind.replaceAll("_", " ") },
  }])).values()];
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      tool: { driver: { name: "N0 Verify", version: result.toolVersion, rules } },
      results: result.findings.map((finding) => ({
        ruleId: finding.ruleId,
        level: finding.severity === "blocking" || finding.severity === "critical" ? "error" : finding.severity === "warning" ? "warning" : "note",
        message: { text: finding.message },
        ...(finding.path ? { locations: [{ physicalLocation: { artifactLocation: { uri: finding.path }, region: { startLine: finding.line ?? 1 } } }] } : {}),
      })),
    }],
  };
}

function findingHtml(finding: Finding): string {
  return `<article class="finding ${escapeHtml(finding.severity)}"><strong>${escapeHtml(finding.ruleId)} — ${escapeHtml(finding.kind.replaceAll("_", " "))}</strong>${finding.path ? `<p>${escapeHtml(finding.path)}${finding.line ? `:${finding.line}` : ""}</p>` : ""}<p>${escapeHtml(finding.message)}</p>${finding.evidence ? `<code>${escapeHtml(finding.evidence)}</code>` : ""}</article>`;
}
function escapeHtml(value: string): string { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
