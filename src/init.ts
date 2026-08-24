import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { defaultConfig, serializeConfig } from "./config.js";
import { detectAdapter, goAdapter, javascriptAdapter, pythonAdapter, rustAdapter, type LanguageAdapter } from "./adapters.js";

export interface InitializeOptions {
  cwd: string;
  force?: boolean | undefined;
  language?: string | undefined;
  ci?: string | undefined;
}

export async function initializeProject(options: InitializeOptions): Promise<string[]> {
  const directory = join(options.cwd, ".n0");
  const config = structuredClone(defaultConfig);
  const adapter = await selectAdapter(options.cwd, options.language);
  if (adapter) {
    const discovered = await adapter.discoverCommands(options.cwd);
    config.commands = {
      ...(discovered.install ? { install: discovered.install } : {}),
      ...(discovered.build ? { build: discovered.build } : {}),
      ...(discovered.lint ? { lint: discovered.lint } : {}),
      ...(discovered.typecheck ? { typecheck: discovered.typecheck } : {}),
      ...(discovered.test ? { test: discovered.test } : {}),
      ...(discovered.coverage ? { coverage: discovered.coverage } : {}),
    };
  }
  const files: Array<[string, string]> = [
    ["n0.config.yml", serializeConfig(config)],
    ["requirements.yml", `version: 1
requirements:
  - id: EXAMPLE-01
    statement: Replace this example with a behavior the change must demonstrate
    severity: high
    mandatory: false
    evidence:
      - runtime_test
      - negative_test
`],
    ["waivers.yml", "version: 1\nwaivers: []\n"],
    [join("policies", "default.yml"), `version: 1
description: Default local policy. Pull requests trust the copy on the base branch.
`],
  ];
  if (options.ci && options.ci !== "github") throw new Error("--ci currently supports only github");
  if (options.ci === "github") files.push([join("..", ".github", "workflows", "n0-verify.yml"), githubWorkflow()]);

  await mkdir(join(directory, "policies"), { recursive: true });
  const created: string[] = [];
  for (const [relative, content] of files) {
    const path = join(directory, relative);
    if (!options.force && await exists(path)) continue;
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, content, "utf8");
    created.push(path);
  }
  return created;
}

async function selectAdapter(cwd: string, language?: string): Promise<LanguageAdapter | undefined> {
  if (!language) return await detectAdapter(cwd, defaultConfig);
  const aliases: Record<string, LanguageAdapter> = {
    javascript: javascriptAdapter, js: javascriptAdapter, typescript: javascriptAdapter, ts: javascriptAdapter,
    python: pythonAdapter, py: pythonAdapter, go: goAdapter, golang: goAdapter, rust: rustAdapter,
  };
  const adapter = aliases[language.toLowerCase()];
  if (!adapter) throw new Error(`Unsupported language hint: ${language}`);
  return adapter;
}

function githubWorkflow(): string {
  return `name: N0 Verify
on:
  pull_request:
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
        with:
          fetch-depth: 0
      - id: n0
        run: npx --yes n0-verify check --base \${{ github.event.pull_request.base.sha }} --head \${{ github.event.pull_request.head.sha }} --mode worktree
      - if: always()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
        with:
          name: n0-proof
          path: .n0/runs
          if-no-files-found: warn
`;
}

async function exists(path: string): Promise<boolean> {
  try { await readFile(path); return true; } catch { return false; }
}
