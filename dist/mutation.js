import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parseDiffLines } from "./diff.js";
import { runCommand, runShellCommand, sanitizedEnvironment } from "./process.js";
export async function runChangedLineMutations(options) {
    if (!options.config.negativeControl.enabled || !options.plan.test || options.config.execution.mode === "audit")
        return [];
    const candidates = generateCandidates(options.patch, options.files).slice(0, options.config.negativeControl.maxMutants);
    if (!candidates.length)
        return [];
    const root = await mkdtemp(join(tmpdir(), "n0-mutants-"));
    const directory = join(root, "head");
    const results = [];
    try {
        const added = await runCommand("git", ["worktree", "add", "--detach", directory, options.head], { cwd: options.repository });
        if (added.exitCode !== 0)
            throw new Error(added.stderr);
        if (options.plan.install) {
            const install = await runShellCommand(options.plan.install, { cwd: directory, timeoutMs: options.config.execution.timeoutSeconds * 1000, env: sanitizedEnvironment("mutation-install", directory) });
            if (install.exitCode !== 0)
                return candidates.map((candidate) => ({ ...candidate, status: "ERROR", durationMs: 0 }));
        }
        for (const candidate of candidates) {
            const path = join(directory, ...candidate.path.split("/"));
            const original = await readFile(path, "utf8");
            const lines = original.split(/\r?\n/u);
            const index = candidate.line - 1;
            if (index < 0 || index >= lines.length || !lines[index]?.includes(candidate.from)) {
                results.push({ ...candidate, status: "INVALID", durationMs: 0 });
                continue;
            }
            lines[index] = lines[index]?.replace(candidate.from, candidate.to);
            await mkdir(dirname(path), { recursive: true });
            await writeFile(path, lines.join("\n"), "utf8");
            const started = Date.now();
            const run = await runShellCommand(options.plan.test, { cwd: directory, timeoutMs: options.config.execution.timeoutSeconds * 1000, env: sanitizedEnvironment(candidate.id, directory) });
            const output = `${run.stdout}\n${run.stderr}`;
            const status = run.timedOut ? "TIMEOUT" : run.exitCode === 0 ? "SURVIVED" : /syntaxerror|compile error|cannot find module|importerror/iu.test(output) ? "INVALID" : "KILLED";
            results.push({ ...candidate, status, durationMs: Date.now() - started });
            await writeFile(path, original, "utf8");
        }
        return results;
    }
    catch {
        return candidates.map((candidate) => ({ ...candidate, status: "ERROR", durationMs: 0 }));
    }
    finally {
        await runCommand("git", ["worktree", "remove", "--force", directory], { cwd: options.repository }).catch(() => undefined);
        await rm(root, { recursive: true, force: true });
    }
}
function generateCandidates(patch, files) {
    const production = new Set(files.filter((file) => ["production", "security_sensitive"].includes(file.category)).map((file) => file.path));
    const operations = [
        [/\btrue\b/u, "true", "false"], [/\bfalse\b/u, "false", "true"], [/>=/u, ">=", ">"], [/<=/u, "<=", "<"], [/===/u, "===", "!=="], [/==/u, "==", "!="], [/\breturn\s+null\b/u, "null", "[]"],
    ];
    const result = [];
    for (const line of parseDiffLines(patch).filter((item) => item.kind === "added" && production.has(item.path))) {
        for (const [regex, from, to] of operations) {
            if (!regex.test(line.content))
                continue;
            result.push({ id: `MUT-${String(result.length + 1).padStart(3, "0")}`, path: line.path, line: line.line, operator: `${from}->${to}`, from, to });
            break;
        }
    }
    return result;
}
//# sourceMappingURL=mutation.js.map