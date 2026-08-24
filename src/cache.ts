import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface CacheKeyInput {
  commit: string;
  lockfileHash: string;
  commandHash: string;
  environmentFingerprint: string;
  policyHash: string;
}

export function cacheKey(input: CacheKeyInput): string {
  return createHash("sha256").update(JSON.stringify(input, Object.keys(input).sort())).digest("hex");
}

export class EvidenceCache {
  constructor(private readonly root: string) {}
  async get<T>(trust: "base" | "candidate", key: string): Promise<T | undefined> {
    try { return JSON.parse(await readFile(join(this.root, trust, `${key}.json`), "utf8")) as T; } catch { return undefined; }
  }
  async set<T>(trust: "base" | "candidate", key: string, value: T): Promise<void> {
    const directory = join(this.root, trust);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, `${key}.json`), `${JSON.stringify(value)}\n`, "utf8");
  }
}
