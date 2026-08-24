import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("container contract uses a read-only source and a constrained writable workspace", async () => {
  const source = await readFile(new URL("runner-core.ts", import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/u, ""), "utf8").catch(async () => await readFile("src/runner-core.ts", "utf8"));
  assert.match(source, /dst=\/source,readonly/);
  assert.match(source, /--read-only/);
  assert.match(source, /--cap-drop/);
  assert.match(source, /no-new-privileges/);
  assert.match(source, /--pids-limit/);
  assert.match(source, /--network/);
  assert.match(source, /--user[\s\S]*65532:65532/);
});

test("GitHub Action declares strict mode and the proof artifact output", async () => {
  const metadata = await readFile("action.yml", "utf8");
  assert.match(metadata, /^ {2}strict:/mu);
  assert.match(metadata, /^ {2}proof_directory:/mu);
  assert.match(metadata, /upload-artifact/);
});
