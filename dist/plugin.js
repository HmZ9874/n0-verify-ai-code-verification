import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
export async function loadPlugin(path) {
    const module = await import(pathToFileURL(resolve(path)).href);
    const value = (module.default ?? module.plugin);
    if (!value || typeof value.name !== "string" || typeof value.version !== "string")
        throw new Error(`Invalid N0 plugin: ${path}`);
    for (const key of ["adapters", "detectors", "reporters", "runners"])
        if (value[key] && !Array.isArray(value[key]))
            throw new Error(`Plugin ${key} must be an array: ${path}`);
    return value;
}
//# sourceMappingURL=plugin.js.map