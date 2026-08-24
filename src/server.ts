import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { verifyRepository } from "./verify.js";
import { runDoctor } from "./doctor.js";
import { listProofRuns } from "./dashboard.js";
import { verifyProofPack } from "./proof.js";

interface Request { id?: string | number | undefined; method?: string | undefined; params?: Record<string, unknown> | undefined }
export async function serveStdio(): Promise<void> {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of lines) {
    let request: Request;
    try { request = JSON.parse(line) as Request; } catch { respond(undefined, undefined, { code: -32700, message: "Parse error" }); continue; }
    try {
      if (request.method === "initialize") respond(request.id, { protocolVersion: "2025-03-26", serverInfo: { name: "n0-verify", version: "0.1.0" }, capabilities: { tools: {} } });
      else if (request.method === "tools/list") respond(request.id, { tools: [
        { name: "n0_check", description: "Verify repository evidence", inputSchema: { type: "object", properties: { cwd: { type: "string" }, base: { type: "string" }, mode: { enum: ["audit", "worktree", "container"] }, claims: { type: "string" } } } },
        { name: "n0_doctor", description: "Inspect verifier prerequisites", inputSchema: { type: "object", properties: { cwd: { type: "string" } } } },
        { name: "n0_runs", description: "List local proof runs", inputSchema: { type: "object", properties: { cwd: { type: "string" } } } },
        { name: "n0_proof_verify", description: "Verify a Proof Pack", inputSchema: { type: "object", required: ["directory"], properties: { directory: { type: "string" } } } },
      ] });
      else if (request.method === "tools/call") await callTool(request);
      else if (!request.method?.startsWith("notifications/")) respond(request.id, undefined, { code: -32601, message: "Method not found" });
    } catch (error) { respond(request.id, undefined, { code: -32000, message: error instanceof Error ? error.message : String(error) }); }
  }
}

async function callTool(request: Request): Promise<void> {
  const name = request.params?.name;
  const args = (request.params?.arguments ?? {}) as Record<string, unknown>;
  const cwd = typeof args.cwd === "string" ? resolve(args.cwd) : process.cwd();
  if (name === "n0_check") {
    const result = await verifyRepository({ cwd, ...(typeof args.base === "string" ? { base: args.base } : {}), ...(typeof args.mode === "string" ? { mode: args.mode as "audit" | "worktree" | "container" } : {}), ...(typeof args.claims === "string" ? { claimsPath: args.claims } : {}) });
    toolResult(request.id, result);
  } else if (name === "n0_doctor") toolResult(request.id, await runDoctor(cwd));
  else if (name === "n0_runs") toolResult(request.id, await listProofRuns(cwd));
  else if (name === "n0_proof_verify" && typeof args.directory === "string") toolResult(request.id, await verifyProofPack(resolve(args.directory)));
  else respond(request.id, undefined, { code: -32601, message: "Unknown tool" });
}
function toolResult(id: Request["id"], value: unknown): void { respond(id, { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] }); }
function respond(id: Request["id"], result?: unknown, error?: { code: number; message: string }): void { process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: id ?? null, ...(error ? { error } : { result }) })}\n`); }
