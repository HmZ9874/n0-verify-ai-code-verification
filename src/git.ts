import { runCommand } from "./process.js";
import type { ChangedFile } from "./model.js";

async function git(cwd: string, args: string[]): Promise<string> {
  const result = await runCommand("git", args, { cwd });
  if (result.exitCode !== 0) throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  return result.stdout;
}
export async function repositoryRoot(cwd: string): Promise<string> { return (await git(cwd, ["rev-parse", "--show-toplevel"])).trim(); }
export async function resolveRef(cwd: string, ref: string): Promise<string> { return (await git(cwd, ["rev-parse", "--verify", ref])).trim(); }
export async function mergeBase(cwd: string, base: string, head: string): Promise<string> { return (await git(cwd, ["merge-base", base, head])).trim(); }
export async function diffPatch(cwd: string, base: string, head: string): Promise<string> { return await git(cwd, ["diff", "--no-ext-diff", "--unified=3", base, head, "--"]); }
export async function showFile(cwd: string, ref: string, path: string): Promise<string> { return await git(cwd, ["show", `${ref}:${path}`]); }
export async function changedFiles(cwd: string, base: string, head: string): Promise<ChangedFile[]> {
  const output = await git(cwd, ["diff", "--name-status", "--find-renames", base, head, "--"]);
  return output.split(/\r?\n/u).filter(Boolean).map((line) => {
    const parts = line.split("\t"); const code = parts[0] ?? ""; const path = (code.startsWith("R") ? parts[2] : parts[1]) ?? "";
    const status: ChangedFile["status"] = code.startsWith("A") ? "added" : code.startsWith("M") ? "modified" : code.startsWith("D") ? "deleted" : code.startsWith("R") ? "renamed" : "unknown";
    const result: ChangedFile = { path, status, category: classifyFile(path) }; if (code.startsWith("R") && parts[1]) result.oldPath = parts[1]; return result;
  });
}
export function classifyFile(path: string): ChangedFile["category"] {
  const normalized = path.replaceAll("\\", "/").toLowerCase(); const name = normalized.split("/").at(-1) ?? normalized;
  if (normalized.includes("/__tests__/") || /(^|\/)(test|tests)(\/|$)/u.test(normalized) || /\.(test|spec)\.[cm]?[jt]sx?$/u.test(normalized) || /(^|\/)test_[^/]+\.py$|_test\.py$|_test\.go$/u.test(normalized)) return "test";
  if (/\.snap$/u.test(normalized) || normalized.includes("/generated/") || normalized.startsWith("generated/")) return "generated";
  if (["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock", "uv.lock", "cargo.lock"].includes(name)) return "lockfile";
  if (["package.json", "pyproject.toml", "requirements.txt", "setup.py", "cargo.toml", "go.mod"].includes(name)) return "dependency";
  if (normalized.startsWith(".github/workflows/")) return "ci";
  if (/^(jest|vitest|pytest|tox|coverage)|(^|\/)(jest|vitest|pytest)[^/]*\.(json|js|ts|ini|toml)$/u.test(name)) return "test_configuration";
  if (/^(tsconfig|eslint)|(^|\/)(dockerfile|makefile)$/u.test(name) || normalized.startsWith(".github/")) return "build_configuration";
  if (/\.(md|mdx|txt|rst)$/u.test(normalized)) return "documentation";
  if (/(^|\/)(auth|authentication|payment|crypto|migrations?|secrets?|permissions?)(\/|\.|$)/u.test(normalized)) return "security_sensitive";
  if (/\.[cm]?[jt]sx?$|\.py$|\.go$|\.rs$|\.java$|\.cs$/u.test(normalized) || normalized.startsWith("src/") || normalized.startsWith("lib/")) return "production";
  if (/\.(ya?ml|json|toml|ini)$/u.test(normalized)) return "configuration";
  return "unknown";
}
