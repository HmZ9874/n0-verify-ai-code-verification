import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { LanguageAdapter } from "./adapters.js";
import type { Finding, VerificationResult } from "./model.js";
import type { RemoteRunner } from "./remote-runner.js";

export interface DetectorPlugin {
  id: string;
  analyze(input: { repository: string; base: string; head: string; patch: string }): Promise<Finding[]>;
}
export interface ReporterPlugin {
  id: string;
  write(result: VerificationResult, outputDirectory: string): Promise<string[]>;
}
export interface N0Plugin {
  name: string;
  version: string;
  adapters?: LanguageAdapter[] | undefined;
  detectors?: DetectorPlugin[] | undefined;
  reporters?: ReporterPlugin[] | undefined;
  runners?: RemoteRunner[] | undefined;
}

export async function loadPlugin(path: string): Promise<N0Plugin> {
  const module = await import(pathToFileURL(resolve(path)).href) as { default?: unknown; plugin?: unknown };
  const value = (module.default ?? module.plugin) as Partial<N0Plugin> | undefined;
  if (!value || typeof value.name !== "string" || typeof value.version !== "string") throw new Error(`Invalid N0 plugin: ${path}`);
  for (const key of ["adapters", "detectors", "reporters", "runners"] as const) if (value[key] && !Array.isArray(value[key])) throw new Error(`Plugin ${key} must be an array: ${path}`);
  return value as N0Plugin;
}
