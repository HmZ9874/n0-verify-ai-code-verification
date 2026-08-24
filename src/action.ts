import { appendFile, readFile } from "node:fs/promises";
import { verifyRepository } from "./verify.js";

interface PullRequestEvent {
  pull_request?: { number?: number; base?: { sha?: string }; head?: { sha?: string; repo?: { fork?: boolean } } };
  repository?: { full_name?: string };
}

async function main(): Promise<void> {
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8")) as PullRequestEvent : undefined;
  const base = process.env.INPUT_BASE || event?.pull_request?.base?.sha;
  const head = process.env.INPUT_HEAD || event?.pull_request?.head?.sha || "HEAD";
  const requestedMode = (process.env.INPUT_MODE || "worktree") as "audit" | "worktree" | "container";
  const fork = event?.pull_request?.head?.repo?.fork === true;
  const mode = fork && process.env.INPUT_ALLOW_FORK_EXECUTION !== "true" ? "audit" : requestedMode;
  if (process.env.INPUT_STRICT === "true") process.env.N0_STRICT = "true";
  try {
    const result = await verifyRepository({ cwd: workspace, ...(base ? { base } : {}), head, mode, writeProof: true });
    const summary = `<!-- n0-verify-result -->
# N0 Verify: ${result.decision}

- Evidence: ${result.evidenceStatus}
- Mode: ${mode}${fork && mode === "audit" ? " (fork safety fallback)" : ""}
- Findings: ${result.findings.length}
- Proof: ${result.proofDirectory ?? "not generated"}

${result.findings.map((finding) => `- **${finding.ruleId}** ${finding.message}`).join("\n")}
`;
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary, "utf8");
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `decision=${result.decision}\nevidence_status=${result.evidenceStatus}\nproof_directory=${result.proofDirectory ?? ""}\n`, "utf8");
    if (process.env.INPUT_COMMENT !== "false") await updatePullRequestComment(event, summary).catch((error) => console.warn(`Could not update PR comment: ${error instanceof Error ? error.message : String(error)}`));
    console.log(summary);
    process.exitCode = result.decision === "BLOCK" ? 1 : result.evidenceStatus === "INCONCLUSIVE" ? 2 : 0;
  } catch (error) {
    console.error(`N0 Verify Action failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 3;
  }
}

async function updatePullRequestComment(event: PullRequestEvent | undefined, body: string): Promise<void> {
  const token = process.env.INPUT_GITHUB_TOKEN;
  const repository = event?.repository?.full_name ?? process.env.GITHUB_REPOSITORY;
  const number = event?.pull_request?.number;
  if (!token || !repository || !number) return;
  const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" };
  const commentsResponse = await fetch(`https://api.github.com/repos/${repository}/issues/${number}/comments?per_page=100`, { headers });
  if (!commentsResponse.ok) throw new Error(`GitHub comments lookup returned ${commentsResponse.status}`);
  const comments = await commentsResponse.json() as Array<{ id: number; body?: string }>;
  const existing = comments.find((comment) => comment.body?.includes("<!-- n0-verify-result -->"));
  const url = existing ? `https://api.github.com/repos/${repository}/issues/comments/${existing.id}` : `https://api.github.com/repos/${repository}/issues/${number}/comments`;
  const response = await fetch(url, { method: existing ? "PATCH" : "POST", headers, body: JSON.stringify({ body }) });
  if (!response.ok) throw new Error(`GitHub comment update returned ${response.status}`);
}

void main();
