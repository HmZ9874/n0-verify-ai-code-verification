import "./extensions.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderHtmlReport, renderSarif } from "./report.js";
import { sha256, signHash, verifySignature } from "./signing.js";
export async function produceProofPack(options) {
    const runId = `n0_${options.result.generatedAt.replace(/[-:.TZ]/gu, "").slice(0, 14)}_${options.result.head.slice(0, 8)}`;
    const directory = join(options.outputRoot ?? join(options.result.repository, ".n0", "runs"), runId);
    await mkdir(join(directory, "logs"), { recursive: true });
    const proof = { ...options.result, proofDirectory: directory };
    const artifacts = {
        "proof.json": proof,
        "git-diff.json": { base: options.result.base, head: options.result.head, changedFiles: options.result.changedFiles },
        "changed-files.json": options.result.changedFiles,
        "claims.json": options.result.claims ?? [],
        "findings.json": options.result.findings,
        "requirements.json": options.result.requirements ?? [],
        "requirement-matrix.json": options.result.requirements ?? [],
        "test-results.json": { runs: options.result.runs ?? [], matrix: options.result.matrix, baseInventory: options.result.baseInventory, headInventory: options.result.headInventory },
        "mutation-results.json": options.result.mutations ?? [],
        "environment.json": safeEnvironmentSummary(),
        "commands.jsonl": (options.result.runs ?? []).flatMap((run) => run.commands),
        "report.sarif.json": renderSarif(options.result),
    };
    const hashes = {};
    for (const [name, value] of Object.entries(artifacts)) {
        const text = name.endsWith(".jsonl") ? value.map((entry) => canonicalJson(entry)).join("\n") + "\n" : `${canonicalJson(value)}\n`;
        await writeFile(join(directory, name), text, "utf8");
        hashes[name] = sha256(text);
    }
    const html = renderHtmlReport(options.result);
    await writeFile(join(directory, "report.html"), html, "utf8");
    hashes["report.html"] = sha256(html);
    for (const run of options.result.runs ?? []) {
        for (const command of run.commands) {
            const filename = `${run.snapshot}-${command.name}`.replace(/[^a-z0-9-]/giu, "-").toLowerCase();
            const log = `# stdout\n${command.stdout}\n# stderr\n${command.stderr}`;
            await writeFile(join(directory, "logs", `${filename}.log`), log, "utf8");
            hashes[`logs/${filename}.log`] = sha256(log);
        }
    }
    const proofHash = sha256(canonicalJson(proof));
    const manifest = {
        schemaVersion: "1.0", runId, baseCommit: options.result.base, headCommit: options.result.head,
        startedAt: options.result.generatedAt, isolationMode: options.result.isolationMode ?? "audit",
        policyHash: sha256(canonicalJson(options.config)), proofHash, files: hashes,
    };
    await writeFile(join(directory, "manifest.json"), `${canonicalJson(manifest)}\n`, "utf8");
    if (options.signingKey)
        await writeFile(join(directory, "signature.json"), `${canonicalJson(await signHash(proofHash, options.signingKey))}\n`, "utf8");
    return { directory, manifest };
}
export async function verifyProofPack(directory) {
    const errors = [];
    const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"));
    const proof = JSON.parse(await readFile(join(directory, "proof.json"), "utf8"));
    if (sha256(canonicalJson(proof)) !== manifest.proofHash)
        errors.push("proof.json does not match manifest proofHash");
    for (const [name, expected] of Object.entries(manifest.files)) {
        try {
            if (sha256(await readFile(join(directory, ...name.split("/")))) !== expected)
                errors.push(`${name} hash mismatch`);
        }
        catch {
            errors.push(`${name} is missing`);
        }
    }
    try {
        const signature = JSON.parse(await readFile(join(directory, "signature.json"), "utf8"));
        if (signature.signedHash !== manifest.proofHash || !verifySignature(signature))
            errors.push("Signature is invalid");
    }
    catch { /* Unsigned packs remain hash-verifiable. */ }
    return { valid: errors.length === 0, errors };
}
export function canonicalJson(value) { return JSON.stringify(sortValue(value)); }
function sortValue(value) {
    if (Array.isArray(value))
        return value.map(sortValue);
    if (value && typeof value === "object")
        return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortValue(item)]));
    return value;
}
function safeEnvironmentSummary() { return { platform: process.platform, arch: process.arch, node: process.version, ci: process.env.CI === "true" }; }
//# sourceMappingURL=proof-core.js.map