import { access } from "node:fs/promises";
import { join } from "node:path";
import { runCommand } from "./process.js";

export interface DoctorCheck { name: string; status: "PASS" | "WARN" | "FAIL"; detail: string }

export async function runDoctor(cwd: string): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  checks.push(await commandCheck("Git", "git", ["--version"], cwd, true));
  checks.push(await commandCheck("Node.js", process.execPath, ["--version"], cwd, true));
  checks.push(await commandCheck("Python", process.platform === "win32" ? "python" : "python3", ["--version"], cwd, false));
  checks.push(await commandCheck("Docker", "docker", ["--version"], cwd, false));
  checks.push(await commandCheck("Podman", "podman", ["--version"], cwd, false));
  try {
    await access(join(cwd, ".git"));
    checks.push({ name: "Git repository", status: "PASS", detail: cwd });
  } catch {
    checks.push({ name: "Git repository", status: "FAIL", detail: "No .git directory was found." });
  }
  try {
    await access(join(cwd, ".n0", "n0.config.yml"));
    checks.push({ name: "N0 configuration", status: "PASS", detail: ".n0/n0.config.yml" });
  } catch {
    checks.push({ name: "N0 configuration", status: "WARN", detail: "Run n0-verify init to create a project policy." });
  }
  const status = await runCommand("git", ["status", "--porcelain"], { cwd }).catch(() => undefined);
  if (status) checks.push({
    name: "Working tree",
    status: status.stdout.trim() ? "WARN" : "PASS",
    detail: status.stdout.trim() ? "The working tree contains uncommitted files." : "Clean",
  });
  return checks;
}

async function commandCheck(
  name: string,
  command: string,
  args: string[],
  cwd: string,
  required: boolean,
): Promise<DoctorCheck> {
  try {
    const result = await runCommand(command, args, { cwd, timeoutMs: 10_000 });
    if (result.exitCode === 0) return { name, status: "PASS", detail: (result.stdout || result.stderr).trim() };
    return { name, status: required ? "FAIL" : "WARN", detail: result.stderr.trim() || "Unavailable" };
  } catch {
    return { name, status: required ? "FAIL" : "WARN", detail: "Not installed or not on PATH" };
  }
}
