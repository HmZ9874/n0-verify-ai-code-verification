import { verifyRepository as verifyLegacy, type VerifyOptions } from "./verify-core-legacy.js";
import { loadTrustedConfig } from "./config.js";
import { mergeBase, repositoryRoot, resolveRef } from "./git.js";
export type { VerifyOptions } from "./verify-core-legacy.js";

export async function verifyRepository(options: VerifyOptions) {
  const mode = options.mode ?? await configuredMode(options);
  if (mode === "audit") return await verifyLegacy({ ...options, mode: "audit", testCommand: undefined });
  return await verifyLegacy(options);
}

async function configuredMode(options: VerifyOptions) {
  const repository = await repositoryRoot(options.cwd);
  const head = await resolveRef(repository, options.head ?? "HEAD");
  const requestedBase = await resolveRef(repository, options.base ?? "HEAD~1");
  const base = options.base ? await mergeBase(repository, requestedBase, head) : requestedBase;
  return (await loadTrustedConfig(repository, base)).config.execution.mode;
}
