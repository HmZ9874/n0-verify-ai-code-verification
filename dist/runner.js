import { createHash } from "node:crypto";
import { executePlan as executeCore } from "./runner-core.js";
export async function executePlan(options) {
    try {
        return await executeCore(options);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const now = new Date().toISOString();
        return {
            snapshot: options.snapshot, ref: options.ref, status: "BLOCKED", summary: `Execution environment blocked the run: ${message}`,
            commands: [{
                    id: `RUN-${createHash("sha256").update(message).digest("hex").slice(0, 12)}`, name: "environment", command: "",
                    cwd: options.directory, status: "BLOCKED", exitCode: 3, startedAt: now, finishedAt: now, durationMs: 0,
                    timedOut: false, stdout: "", stderr: message,
                    stdoutHash: `sha256:${createHash("sha256").update("").digest("hex")}`,
                    stderrHash: `sha256:${createHash("sha256").update(message).digest("hex")}`,
                }],
        };
    }
}
//# sourceMappingURL=runner.js.map