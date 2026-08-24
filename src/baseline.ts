import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveRef } from "./git.js";
import type { TestInventory } from "./model.js";

export interface BaselineRecord {
  schemaVersion: 1;
  commit: string;
  createdAt: string;
  inventory?: TestInventory | undefined;
  knownFailures: string[];
  warnings: string[];
}

export async function createBaseline(repository: string, inventory?: TestInventory): Promise<BaselineRecord> {
  const record: BaselineRecord = {
    schemaVersion: 1,
    commit: await resolveRef(repository, "HEAD"),
    createdAt: new Date().toISOString(),
    ...(inventory ? { inventory } : {}),
    knownFailures: [],
    warnings: [],
  };
  await mkdir(join(repository, ".n0"), { recursive: true });
  await writeFile(join(repository, ".n0", "baseline.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return record;
}

export async function inspectBaseline(repository: string): Promise<BaselineRecord> {
  return JSON.parse(await readFile(join(repository, ".n0", "baseline.json"), "utf8")) as BaselineRecord;
}
