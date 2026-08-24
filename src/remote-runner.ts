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

export class HttpRemoteRunner implements RemoteRunner {
  constructor(private readonly endpoint: string, private readonly token?: string) {}
  async run(request: RemoteRunRequest): Promise<RemoteRunResponse> {
    const response = await fetch(new URL("runs", this.endpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`Remote runner returned HTTP ${response.status}`);
    return await response.json() as RemoteRunResponse;
  }
}
