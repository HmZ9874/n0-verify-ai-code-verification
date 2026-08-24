# Adapter SDK

An adapter detects a project, discovers commands and classifies production and
test files.

```ts
interface LanguageAdapter {
  id: string;
  detect(directory: string): Promise<number>;
  discoverCommands(directory: string): Promise<CommandPlan>;
  isTestFile(path: string): boolean;
  isProductionFile(path: string): boolean;
}
```

JavaScript/TypeScript and Python adapters ship with the core. External adapters
should not execute candidate code during detection and must return discovered
commands as untrusted suggestions unless trusted base policy approves them.
