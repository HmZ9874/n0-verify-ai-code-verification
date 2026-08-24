import { mkdir, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ChangedFile, MatrixResult, SnapshotRun } from "./model.js";
import type { CommandPlan } from "./adapters.js";
import type { N0Config } from "./config.js";
import { runCommand } from "./process.js";
import { executePlan } from "./runner.js";
import { showFile } from "./git.js";

export async function runFourWayMatrix(options: { repository: string; base: string; head: string; files: ChangedFile[]; plan: CommandPlan; config: N0Config }): Promise<MatrixResult> {
  if (!options.config.matrix.enabled || !options.plan.test || options.config.execution.mode === "audit") return { status: "NOT_RUN", cells: {}, interpretation: "Matrix execution is disabled or audit-only mode is active." };
  const tests = options.files.filter((file) => file.category === "test");
  if (!tests.length) return { status: "NOT_RUN", cells: {}, interpretation: "No changed tests were available for matrix composition." };
  const root = await mkdtemp(join(tmpdir(), "n0-matrix-"));
  const directories = { C0T0: join(root, "c0t0"), C1T0: join(root, "c1t0"), C0T1: join(root, "c0t1"), C1T1: join(root, "c1t1") };
  const cells: MatrixResult["cells"] = {};
  try {
    await Promise.all([
      addWorktree(options.repository, directories.C0T0, options.base), addWorktree(options.repository, directories.C1T0, options.head),
      addWorktree(options.repository, directories.C0T1, options.base), addWorktree(options.repository, directories.C1T1, options.head),
    ]);
    await Promise.all([
      applyTestVersion(options.repository, directories.C1T0, tests, options.base, "base"),
      applyTestVersion(options.repository, directories.C0T1, tests, options.head, "head"),
    ]);
    const keys = ["C0T0", "C1T0", "C0T1", "C1T1"] as const;
    const executed = await Promise.all(keys.map(async (key) => [key, await executePlan({ directory: directories[key], ref: key.startsWith("C0") ? options.base : options.head, snapshot: key.toLowerCase() as SnapshotRun["snapshot"], plan: options.plan, config: options.config, testOnly: true })] as const));
    for (const [key, run] of executed) cells[key] = run;
    return { status: "COMPLETE", cells, interpretation: interpret(cells) };
  } catch (error) {
    return { status: Object.keys(cells).length ? "PARTIAL" : "NOT_RUN", cells, interpretation: `Matrix composition failed: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    await Promise.all(Object.values(directories).map((directory) => removeWorktree(options.repository, directory)));
    await rm(root, { recursive: true, force: true });
  }
}

async function applyTestVersion(repository: string, directory: string, tests: ChangedFile[], ref: string, version: "base" | "head"): Promise<void> {
  for (const file of tests) {
    const shouldExist = version === "base" ? file.status !== "added" : file.status !== "deleted";
    const destination = join(directory, ...file.path.split("/"));
    if (!shouldExist) { await unlink(destination).catch(() => undefined); continue; }
    const content = await showFile(repository, ref, version === "base" && file.oldPath ? file.oldPath : file.path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }
}
function interpret(cells: MatrixResult["cells"]): string {
  const status = (key: keyof MatrixResult["cells"]) => cells[key]?.status;
  if (status("C0T0") === "PASS" && status("C1T0") === "PASS" && status("C0T1") === "FAIL" && status("C1T1") === "PASS") return "Ideal differential: old tests remain green and changed tests distinguish base from head.";
  if (status("C0T1") === "PASS" && status("C1T1") === "PASS") return "Changed tests survive on base code and do not distinguish the implementation.";
  if (status("C1T0") === "FAIL" && status("C1T1") === "PASS") return "Head code fails trusted base tests but passes changed tests; review test modifications and breaking-change policy.";
  if (status("C0T0") === "FAIL") return "The trusted base is unhealthy; candidate attribution is inconclusive.";
  return "The observed matrix does not match a high-confidence interpretation.";
}
async function addWorktree(repository: string, path: string, ref: string): Promise<void> { const result = await runCommand("git", ["worktree", "add", "--detach", path, ref], { cwd: repository }); if (result.exitCode !== 0) throw new Error(result.stderr.trim() || "Could not create matrix worktree."); }
async function removeWorktree(repository: string, path: string): Promise<void> { await runCommand("git", ["worktree", "remove", "--force", path], { cwd: repository }).catch(() => undefined); }
