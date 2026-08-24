import type { SnapshotRun } from "./model.js";
export interface RemoteRunRequest {
    repositoryId: string;
    baseCommit: string;
    headCommit: string;
    policyHash: string;
    imageDigest: string;
    commands: string[];
    network: boolean;
}
export interface RemoteRunResponse {
    runId: string;
    runnerIdentity: string;
    imageDigest: string;
    results: SnapshotRun[];
    attestation?: string | undefined;
}
export interface RemoteRunner {
    run(request: RemoteRunRequest): Promise<RemoteRunResponse>;
}
export declare class HttpRemoteRunner implements RemoteRunner {
    private readonly endpoint;
    private readonly token?;
    constructor(endpoint: string, token?: string | undefined);
    run(request: RemoteRunRequest): Promise<RemoteRunResponse>;
}
