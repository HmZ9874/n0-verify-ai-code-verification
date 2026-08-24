import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ChangedFile } from "./model.js";
import type { N0Config } from "./config.js";

export interface CommandPlan { adapter: string; packageManager?: string | undefined; install?: string | undefined; build?: string | undefined; lint?: string | undefined; typecheck?: string | undefined; test?: string | undefined; coverage?: string | undefined }
export interface LanguageAdapter { id: string; detect(directory: string): Promise<number>; discoverCommands(directory: string): Promise<CommandPlan>; isTestFile(path: string): boolean; isProductionFile(path: string): boolean }

export const javascriptAdapter: LanguageAdapter = {
  id: "javascript",
  async detect(directory) { return await fileExists(join(directory, "package.json")) ? 100 : 0; },
  async discoverCommands(directory) {
    const packageJson = JSON.parse(await readFile(join(directory, "package.json"), "utf8")) as { scripts?: Record<string, string> };
    const manager = await detectPackageManager(directory);
    const run = (name: string): string | undefined => packageJson.scripts?.[name] ? `${manager} ${manager === "yarn" ? "" : "run "}${name}`.replace(/\s+/gu, " ").trim() : undefined;
    const install = manager === "npm" ? await fileExists(join(directory, "package-lock.json")) ? "npm ci --ignore-scripts" : "npm install --ignore-scripts" : manager === "pnpm" ? "pnpm install --frozen-lockfile --ignore-scripts" : "yarn install --frozen-lockfile --ignore-scripts";
    return { adapter: "javascript", packageManager: manager, install, ...(run("build") ? { build: run("build") } : {}), ...(run("lint") ? { lint: run("lint") } : {}), ...(run("typecheck") ? { typecheck: run("typecheck") } : {}), ...(run("test") ? { test: run("test") } : {}), ...(run("coverage") ? { coverage: run("coverage") } : {}) };
  },
  isTestFile: (path) => /(^|\/)(test|tests|__tests__)(\/|$)|\.(test|spec)\.[cm]?[jt]sx?$/iu.test(path),
  isProductionFile: (path) => /\.[cm]?[jt]sx?$/iu.test(path) && !javascriptAdapter.isTestFile(path),
};
export const pythonAdapter: LanguageAdapter = {
  id: "python",
  async detect(directory) { for (const name of ["pyproject.toml", "pytest.ini", "requirements.txt", "setup.py"]) if (await fileExists(join(directory, name))) return 90; return 0; },
  async discoverCommands(directory) {
    const manager = await fileExists(join(directory, "uv.lock")) ? "uv" : await fileExists(join(directory, "poetry.lock")) ? "poetry" : "pip";
    const install = manager === "uv" ? "uv sync --frozen" : manager === "poetry" ? "poetry install --no-interaction" : await fileExists(join(directory, "requirements.txt")) ? "python -m pip install -r requirements.txt" : undefined;
    const prefix = manager === "uv" ? "uv run " : manager === "poetry" ? "poetry run " : "python -m ";
    return { adapter: "python", packageManager: manager, ...(install ? { install } : {}), test: `${prefix}pytest`, coverage: `${prefix}pytest --cov` };
  },
  isTestFile: (path) => /(^|\/)(test|tests)(\/|$)|(^|\/)test_[^/]+\.py$|_test\.py$/iu.test(path),
  isProductionFile: (path) => /\.py$/iu.test(path) && !pythonAdapter.isTestFile(path),
};
export const goAdapter: LanguageAdapter = {
  id: "go",
  async detect(directory) { return await fileExists(join(directory, "go.mod")) ? 80 : 0; },
  async discoverCommands() { return { adapter: "go", packageManager: "go", build: "go build ./...", test: "go test ./...", coverage: "go test -coverprofile=coverage.out ./..." }; },
  isTestFile: (path) => /_test\.go$/iu.test(path),
  isProductionFile: (path) => /\.go$/iu.test(path) && !goAdapter.isTestFile(path),
};
export const rustAdapter: LanguageAdapter = {
  id: "rust",
  async detect(directory) { return await fileExists(join(directory, "Cargo.toml")) ? 80 : 0; },
  async discoverCommands(directory) { const locked = await fileExists(join(directory, "Cargo.lock")); return { adapter: "rust", packageManager: "cargo", build: `cargo build${locked ? " --locked" : ""}`, test: `cargo test${locked ? " --locked" : ""}` }; },
  isTestFile: (path) => /(^|\/)tests\/.*\.rs$/iu.test(path),
  isProductionFile: (path) => /\.rs$/iu.test(path) && !rustAdapter.isTestFile(path),
};

export async function detectAdapter(directory: string, config: N0Config, additional: LanguageAdapter[] = []): Promise<LanguageAdapter | undefined> {
  const candidates = [...additional, ...(config.adapters.javascript ? [javascriptAdapter] : []), ...(config.adapters.python ? [pythonAdapter] : []), goAdapter, rustAdapter];
  const scored = await Promise.all(candidates.map(async (adapter) => ({ adapter, score: await adapter.detect(directory) })));
  return scored.sort((a, b) => b.score - a.score).find((item) => item.score > 0)?.adapter;
}
export function mergeCommandPlan(discovered: CommandPlan, configured: N0Config["commands"]): CommandPlan { return { ...discovered, ...Object.fromEntries(Object.entries(configured).filter(([, value]) => value)) }; }
export function adapterForChangedFile(file: ChangedFile): "javascript" | "python" | "go" | "rust" | "unknown" { return /\.[cm]?[jt]sx?$/iu.test(file.path) ? "javascript" : /\.py$/iu.test(file.path) ? "python" : /\.go$/iu.test(file.path) ? "go" : /\.rs$/iu.test(file.path) ? "rust" : "unknown"; }
async function detectPackageManager(directory: string): Promise<"npm" | "pnpm" | "yarn"> { if (await fileExists(join(directory, "pnpm-lock.yaml"))) return "pnpm"; if (await fileExists(join(directory, "yarn.lock"))) return "yarn"; return "npm"; }
async function fileExists(path: string): Promise<boolean> { try { await readFile(path); return true; } catch { return false; } }
