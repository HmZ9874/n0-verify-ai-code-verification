export interface CommandResult {
    exitCode: number;
    stdout: string;
    stderr: string;
    timedOut: boolean;
}
export interface ProcessOptions {
    cwd: string;
    timeoutMs?: number | undefined;
    env?: NodeJS.ProcessEnv | undefined;
    maxOutputBytes?: number | undefined;
}
export declare function runCommand(command: string, args: string[], options: ProcessOptions): Promise<CommandResult>;
export declare function runShellCommand(command: string, options: ProcessOptions): Promise<CommandResult>;
export declare function sanitizedEnvironment(runId: string, temporaryHome?: string): NodeJS.ProcessEnv;
