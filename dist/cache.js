import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
export function cacheKey(input) {
    return createHash("sha256").update(JSON.stringify(input, Object.keys(input).sort())).digest("hex");
}
export class EvidenceCache {
    root;
    constructor(root) {
        this.root = root;
    }
    async get(trust, key) {
        try {
            return JSON.parse(await readFile(join(this.root, trust, `${key}.json`), "utf8"));
        }
        catch {
            return undefined;
        }
    }
    async set(trust, key, value) {
        const directory = join(this.root, trust);
        await mkdir(directory, { recursive: true });
        await writeFile(join(directory, `${key}.json`), `${JSON.stringify(value)}\n`, "utf8");
    }
}
//# sourceMappingURL=cache.js.map