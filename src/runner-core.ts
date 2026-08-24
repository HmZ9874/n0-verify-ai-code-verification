import { createHash } from "node:crypto";
import type { CommandEvidence, CheckStatus, IsolationMode, SnapshotRun } from "./model.js";
import type { CommandPlan } from "./adapters.js";
import type { N0Config } from "./config.js";
import { runCommand, runShellCommand, sanitizedEnvironment } from "./process.js";

export async function executePlan(options: { directory: string; ref: string; snapshot: SnapshotRun["snapshot"]; plan: CommandPlan; config: N0Config; testOnly?: boolean | undefined }): Promise<SnapshotRun> {
  const entries: Array<[string, string | undefined]> = options.testOnly
    ? [["install", options.plan.install], ["test", options.plan.test]]
    : [["install", options.plan.install], ["build", options.plan.build], ["lint", options.plan.lint], ["typecheck", options.plan.typecheck], ["test", options.plan.test]];
  const commands: CommandEvidence[] = [];
  for (const [name, command] of entries) {
    if (!command) continue;
    const evidence = await executeEvidenceCommand({ name, command, directory: options.directory, mode: options.config.execution.mode, config: options.config });
    commands.push(evidence);
    if (evidence.status !== "PASS") break;
  }
  const status: CheckStatus = commands.length === 0 ? "NOT_RUN" : commands.some((command) => command.status === "TIMEOUT") ? "TIMEOUT" : commands.every((command) => command.status === "PASS") ? "PASS" : "FAIL";
  return { snapshot: options.snapshot, ref: options.ref, status, commands, summary: status === "PASS" ? "All configured commands passed." : status === "NOT_RUN" ? "No commands were configured." : "At least one configured command failed." };
}

async function executeEvidenceCommand(options: { name: string; command: string; directory: string; mode: IsolationMode; config: N0Config }): Promise<CommandEvidence> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const timeoutMs = options.config.execution.timeoutSeconds * 1000;
  const runId = `${options.name}-${started}`;
  const result = options.mode === "container"
    ? await runContainerCommand(options.command, options.directory, options.config, timeoutMs, runId)
    : await runShellCommand(options.command, { cwd: options.directory, timeoutMs, env: sanitizedEnvironment(runId, options.directory) });
  const finished = Date.now();
  return {
    id: `RUN-${createHash("sha256").update(`${runId}:${options.command}`).digest("hex").slice(0, 12)}`,
    name: options.name, command: options.command, cwd: options.directory,
    status: result.timedOut ? "TIMEOUT" : result.exitCode === 0 ? "PASS" : "FAIL",
    exitCode: result.exitCode, startedAt, finishedAt: new Date(finished).toISOString(), durationMs: finished - started,
    timedOut: result.timedOut, stdout: result.stdout, stderr: result.stderr,
    stdoutHash: hash(result.stdout), stderrHash: hash(result.stderr),
  };
}

async function runContainerCommand(command: string, directory: string, config: N0Config, timeoutMs: number, runId: string) {
  const image = config.execution.containerImage ?? "node:22-bookworm-slim";
  const network = config.execution.network ? "bridge" : "none";
  const workspaceSizeMb = Math.max(256, config.execution.maxMemoryMb);
  const bootstrap = `mkdir -p /tmp/n0-home && cp -a /source/. /workspace/ && cd /workspace && ${command}`;
  return await runCommand("docker", [
    "run", "--rm", "--network", network,
    "--memory", `${config.execution.maxMemoryMb}m`, "--cpus", String(config.execution.maxCpu), "--pids-limit", "256",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--read-only",
    "--user", "65532:65532",
    "--mount", `type=bind,src=${directory},dst=/source,readonly`,
    "--tmpfs", `/workspace:rw,exec,nosuid,nodev,uid=65532,gid=65532,mode=0700,size=${workspaceSizeMb}m`,
    "--tmpfs", "/tmp:rw,nosuid,nodev,uid=65532,gid=65532,mode=1777,size=256m",
    "-e", "CI=true", "-e", `N0_RUN_ID=${runId}`, "-e", "HOME=/tmp/n0-home", "-e", "LANG=C.UTF-8", "-e", "LC_ALL=C.UTF-8",
    "-w", "/workspace", image, "/bin/sh", "-lc", bootstrap,
  ], { cwd: directory, timeoutMs, env: sanitizedEnvironment(`container-${runId}`, directory) });
}
function hash(value: string): string { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }
