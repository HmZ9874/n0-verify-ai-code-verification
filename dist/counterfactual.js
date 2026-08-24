import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runCommand, runShellCommand } from "./process.js";
import { showFile } from "./git.js";
export async function runCounterfactual(options) {
    if (!options.testCommand) {
        return {
            status: "NOT_RUN",
            evidenceStatus: "INCONCLUSIVE",
            summary: "Counterfactual execution was not requested. Pass --test-command to opt in.",
        };
    }
    const changedTests = options.files.filter((file) => file.category === "test" && (file.status === "added" || file.status === "modified"));
    if (changedTests.length === 0) {
        return {
            status: "NO_CHANGED_TESTS",
            evidenceStatus: "INCONCLUSIVE",
            summary: "No added or modified tests were available for a counterfactual experiment.",
        };
    }
    const temporaryRoot = await mkdtemp(join(tmpdir(), "n0-verify-"));
    const baseDirectory = join(temporaryRoot, "base-with-head-tests");
    const headDirectory = join(temporaryRoot, "head");
    try {
        await addWorktree(options.repository, baseDirectory, options.base);
        await addWorktree(options.repository, headDirectory, options.head);
        for (const test of changedTests) {
            const content = await showFile(options.repository, options.head, test.path);
            const destination = join(baseDirectory, ...test.path.split("/"));
            await mkdir(dirname(destination), { recursive: true });
            await writeFile(destination, content, "utf8");
        }
        const executionOptions = {
            cwd: headDirectory,
            ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
        };
        const headRun = await runShellCommand(options.testCommand, executionOptions);
        if (headRun.exitCode !== 0 || headRun.timedOut) {
            return {
                status: "HEAD_FAILED",
                evidenceStatus: "CONTRADICTED",
                summary: headRun.timedOut
                    ? "The candidate test run timed out."
                    : "The candidate test run failed before a useful counterfactual comparison.",
                headExitCode: headRun.exitCode,
            };
        }
        const counterfactualRun = await runShellCommand(options.testCommand, {
            cwd: baseDirectory,
            ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
        });
        if (counterfactualRun.exitCode === 0 && !counterfactualRun.timedOut) {
            return {
                status: "SURVIVED",
                evidenceStatus: "INCONCLUSIVE",
                summary: "The changed tests pass on both base and head code, so they do not distinguish the change.",
                headExitCode: headRun.exitCode,
                counterfactualExitCode: counterfactualRun.exitCode,
            };
        }
        return {
            status: "COUNTERFACTUAL_REJECTED",
            evidenceStatus: "INCONCLUSIVE",
            summary: "The changed tests reject the base code. This is useful evidence, but this generic adapter cannot yet prove that the target assertion was reached.",
            headExitCode: headRun.exitCode,
            counterfactualExitCode: counterfactualRun.exitCode,
        };
    }
    catch (error) {
        return {
            status: "INVALID_EXPERIMENT",
            evidenceStatus: "INCONCLUSIVE",
            summary: error instanceof Error ? error.message : String(error),
        };
    }
    finally {
        await removeWorktree(options.repository, headDirectory);
        await removeWorktree(options.repository, baseDirectory);
        await rm(temporaryRoot, { recursive: true, force: true });
    }
}
async function addWorktree(repository, path, ref) {
    const result = await runCommand("git", ["worktree", "add", "--detach", path, ref], { cwd: repository });
    if (result.exitCode !== 0)
        throw new Error(result.stderr.trim() || "Could not create a Git worktree.");
}
async function removeWorktree(repository, path) {
    await runCommand("git", ["worktree", "remove", "--force", path], { cwd: repository }).catch(() => undefined);
}
//# sourceMappingURL=counterfactual.js.map