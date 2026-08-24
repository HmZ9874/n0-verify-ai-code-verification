#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { runDemo } from "./demo.js";
import { formatDemo, formatVerification } from "./format.js";
import { verifyRepository } from "./verify.js";
import { initializeProject } from "./init.js";
import { runDoctor } from "./doctor.js";
import { explainRule } from "./rules.js";
import { repositoryRoot } from "./git.js";
import { createBaseline, inspectBaseline } from "./baseline.js";
import { defaultConfig } from "./config.js";
import { detectAdapter } from "./adapters.js";
import { inventoryTests } from "./inventory.js";
import { generateSigningKeyPair } from "./signing.js";
import { verifyProofPack } from "./proof.js";
import { runBenchmark } from "./bench.js";
import { serveStdio } from "./server.js";

const [command = "help", ...rest] = process.argv.slice(2);

try {
  if (command === "init") await initCommand(rest);
  else if (command === "check") await checkCommand(rest);
  else if (command === "demo") await demoCommand(rest);
  else if (command === "doctor") await doctorCommand(rest);
  else if (command === "explain") await explainCommand(rest);
  else if (command === "report") await reportCommand(rest);
  else if (command === "baseline") await baselineCommand(rest);
  else if (command === "proof") await proofCommand(rest);
  else if (command === "bench") await benchCommand(rest);
  else if (command === "serve") await serveStdio();
  else if (command === "--version" || command === "-v" || command === "version") console.log("0.1.0");
  else printHelp();
} catch (error) {
  console.error(`N0 Verify error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 3;
}

async function initCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({ args, options: { force: { type: "boolean" }, language: { type: "string" }, ci: { type: "string" } } });
  const created = await initializeProject({ cwd: process.cwd(), force: values.force, language: values.language, ci: values.ci });
  console.log(created.length ? `Created:\n${created.map((path) => `- ${path}`).join("\n")}` : "N0 configuration already exists. Use --force to replace it.");
}

async function checkCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      base: { type: "string" }, head: { type: "string" }, json: { type: "boolean" }, output: { type: "string" },
      mode: { type: "string" }, "test-command": { type: "string" }, "timeout-ms": { type: "string" },
      "no-proof": { type: "boolean" }, "proof-output": { type: "string" }, "signing-key": { type: "string" }, strict: { type: "boolean" },
    },
  });
  if (values.mode && !["audit", "worktree", "container"].includes(values.mode)) throw new Error("--mode must be audit, worktree, or container");
  const result = await verifyRepository({
    cwd: process.cwd(),
    ...(values.base ? { base: values.base } : {}),
    ...(values.head ? { head: values.head } : {}),
    ...(values.mode ? { mode: values.mode as "audit" | "worktree" | "container" } : {}),
    ...(values["test-command"] ? { testCommand: values["test-command"] } : {}),
    ...(values["timeout-ms"] ? { timeoutMs: numberOption(values["timeout-ms"], "--timeout-ms") } : {}),
    writeProof: !values["no-proof"],
    ...(values["proof-output"] ? { proofOutput: resolve(values["proof-output"]) } : {}),
    ...(values["signing-key"] ? { signingKey: resolve(values["signing-key"]) } : {}),
  });
  if (values.strict && result.decision === "WARN") result.decision = "BLOCK";
  const json = JSON.stringify(result, null, 2);
  if (values.output) await writeFile(resolve(values.output), `${json}\n`, "utf8");
  console.log(values.json ? json : formatVerification(result));
  process.exitCode = result.decision === "BLOCK" ? 1 : result.evidenceStatus === "INCONCLUSIVE" ? 2 : 0;
}

async function demoCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({ args, options: { json: { type: "boolean" } } });
  const result = await runDemo();
  console.log(values.json ? JSON.stringify(result, null, 2) : formatDemo(result));
}

async function doctorCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({ args, options: { json: { type: "boolean" } } });
  const checks = await runDoctor(process.cwd());
  console.log(values.json ? JSON.stringify(checks, null, 2) : checks.map((check) => `${check.status.padEnd(4)}  ${check.name} — ${check.detail}`).join("\n"));
  if (checks.some((check) => check.status === "FAIL")) process.exitCode = 3;
}

async function explainCommand(args: string[]): Promise<void> {
  const [ruleId] = args;
  if (!ruleId) throw new Error("Usage: n0-verify explain RULE-ID");
  const rule = explainRule(ruleId);
  if (!rule) throw new Error(`Unknown rule: ${ruleId}`);
  console.log(`${rule.id} — ${rule.title}\n\n${rule.description}\n\nDefault severity: ${rule.defaultSeverity}\nRemediation: ${rule.remediation}`);
}

async function reportCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({ args, options: { run: { type: "string" }, format: { type: "string", default: "html" } } });
  const root = join(await repositoryRoot(process.cwd()), ".n0", "runs");
  const run = values.run ?? await latestRun(root);
  if (!run || basename(run) !== run) throw new Error("A valid run id is required.");
  const names: Record<string, string> = { html: "report.html", json: "proof.json", sarif: "report.sarif.json" };
  const name = names[values.format ?? "html"];
  if (!name) throw new Error("--format must be html, json, or sarif");
  const path = join(root, run, name);
  await readFile(path);
  console.log(path);
}

async function baselineCommand(args: string[]): Promise<void> {
  const [subcommand = "inspect"] = args;
  const repository = await repositoryRoot(process.cwd());
  if (subcommand === "create" || subcommand === "update") {
    const adapter = await detectAdapter(repository, defaultConfig);
    const inventory = adapter ? await inventoryTests(repository, adapter) : undefined;
    console.log(JSON.stringify(await createBaseline(repository, inventory), null, 2));
  } else if (subcommand === "inspect") console.log(JSON.stringify(await inspectBaseline(repository), null, 2));
  else throw new Error("Usage: n0-verify baseline create|inspect|update");
}

async function proofCommand(args: string[]): Promise<void> {
  const [subcommand, ...remaining] = args;
  if (subcommand === "verify") {
    const [directory] = remaining;
    if (!directory) throw new Error("Usage: n0-verify proof verify DIRECTORY");
    const result = await verifyProofPack(resolve(directory));
    console.log(result.valid ? "Proof pack is valid." : `Proof pack is invalid:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
    if (!result.valid) process.exitCode = 1;
  } else if (subcommand === "keygen") {
    const { values } = parseArgs({ args: remaining, options: { private: { type: "string", default: ".n0/signing-key.pem" }, public: { type: "string", default: ".n0/signing-key.pub.pem" } } });
    await generateSigningKeyPair(resolve(values.private ?? ".n0/signing-key.pem"), resolve(values.public ?? ".n0/signing-key.pub.pem"));
    console.log(`Generated ${values.private} and ${values.public}`);
  } else throw new Error("Usage: n0-verify proof verify DIRECTORY | proof keygen");
}

async function benchCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({ args, options: { json: { type: "boolean" } } });
  const result = await runBenchmark();
  console.log(values.json ? JSON.stringify(result, null, 2) : `N0 Bench\nCases: ${result.cases}\nPrecision: ${(result.precision * 100).toFixed(1)}%\nRecall: ${(result.recall * 100).toFixed(1)}%\nFalse-positive rate: ${(result.falsePositiveRate * 100).toFixed(1)}%\nDuration: ${result.durationMs}ms`);
  if (result.falseNegatives || result.falsePositives) process.exitCode = 1;
}

async function latestRun(root: string): Promise<string | undefined> {
  const entries = await readdir(root, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().at(-1);
}
function numberOption(value: string, name: string): number { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive number`); return parsed; }
function printHelp(): void {
  console.log(`N0 Verify 0.1.0 — independent evidence for agent-written code

Usage:
  n0-verify init [--language NAME] [--ci github] [--force]
  n0-verify check [--base REF] [--head REF] [--mode audit|worktree|container]
                  [--task FILE|--claims FILE] [--test-command COMMAND] [--strict]
                  [--json] [--output FILE]
  n0-verify demo [--json]
  n0-verify doctor [--json]
  n0-verify explain RULE-ID
  n0-verify report [--run ID] [--format html|json|sarif]
  n0-verify baseline create|inspect|update
  n0-verify proof keygen | proof verify DIRECTORY
  n0-verify bench [--json]
  n0-verify serve

Audit mode never executes repository code. Worktree mode is clean but is not a
security sandbox. Use container mode for untrusted code and review its policy.`);
}
