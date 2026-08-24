import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const root = join(process.cwd(), "dist");
const tests = [];
await collect(root);
tests.sort();

if (tests.length === 0) {
  console.error("No compiled test files were found under dist.");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...tests], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: false,
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.isFile() && entry.name.endsWith(".test.js")) tests.push(relative(process.cwd(), path));
  }
}
