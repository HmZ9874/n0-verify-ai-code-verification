import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
export async function runCommand(command, args, options) {
    return await new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: options.cwd,
            shell: false,
            windowsHide: true,
            env: options.env ?? process.env,
        });
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const max = options.maxOutputBytes ?? 10 * 1024 * 1024;
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => { if (stdout.length < max)
            stdout += chunk.slice(0, max - stdout.length); });
        child.stderr.on("data", (chunk) => { if (stderr.length < max)
            stderr += chunk.slice(0, max - stderr.length); });
        child.on("error", reject);
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGTERM");
            setTimeout(() => child.kill("SIGKILL"), 2_000).unref();
        }, options.timeoutMs ?? 120_000);
        child.on("close", (code) => {
            clearTimeout(timer);
            resolve({ exitCode: code ?? 1, stdout, stderr, timedOut });
        });
    });
}
export async function runShellCommand(command, options) {
    const isWindows = process.platform === "win32";
    return await runCommand(isWindows ? "cmd.exe" : "/bin/sh", isWindows ? ["/d", "/s", "/c", command] : ["-c", command], options);
}
export function sanitizedEnvironment(runId, temporaryHome = tmpdir()) {
    const source = process.env;
    const env = {
        PATH: source.PATH ?? "",
        CI: "true",
        N0_RUN_ID: runId,
        HOME: temporaryHome,
        USERPROFILE: temporaryHome,
        LANG: source.LANG ?? "C.UTF-8",
        LC_ALL: source.LC_ALL ?? source.LANG ?? "C.UTF-8",
    };
    for (const name of ["PATHEXT", "SYSTEMROOT", "WINDIR", "COMSPEC", "TEMP", "TMP"]) {
        if (source[name])
            env[name] = source[name];
    }
    return env;
}
//# sourceMappingURL=process.js.map