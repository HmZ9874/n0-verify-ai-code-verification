#!/usr/bin/env node

extractValueOption("--task", "N0_CLAIMS");
extractValueOption("--claims", "N0_CLAIMS");
extractFlag("--strict", "N0_STRICT");
await import("./cli.js");

function extractValueOption(option: string, environmentName: string): void {
  const index = process.argv.indexOf(option);
  if (index < 0) return;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`${option} requires a file path`);
    process.exit(3);
  }
  process.env[environmentName] = value;
  process.argv.splice(index, 2);
}

function extractFlag(option: string, environmentName: string): void {
  const index = process.argv.indexOf(option);
  if (index < 0) return;
  process.env[environmentName] = "true";
  process.argv.splice(index, 1);
}
