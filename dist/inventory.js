import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
const ignored = new Set([".git", "node_modules", "dist", "coverage", ".n0", "target"]);
export async function inventoryTests(directory, adapter) {
    const files = [];
    for (const absolute of await walk(directory)) {
        const path = relative(directory, absolute).replaceAll("\\", "/");
        if (!adapter.isTestFile(path))
            continue;
        try {
            const content = await readFile(absolute, "utf8");
            files.push(adapter.id === "python" ? inventoryPython(path, content) : adapter.id === "go" ? inventoryGo(path, content) : adapter.id === "rust" ? inventoryRust(path, content) : inventoryJavascript(path, content));
        }
        catch { /* Omit binary or unreadable test files. */ }
    }
    return { files, totals: { files: files.length, suites: sum(files, "suites"), tests: sum(files, "tests"), assertions: files.reduce((value, file) => value + file.assertions, 0), skipped: files.reduce((value, file) => value + file.skipped, 0), focused: files.reduce((value, file) => value + file.focused, 0) } };
}
function inventoryJavascript(path, content) { return { path, framework: content.includes("vitest") ? "vitest" : content.includes("node:test") ? "node:test" : "jest/mocha", suites: matches(content, /\bdescribe(?:\.(?:skip|only))?\s*\(\s*["'`]([^"'`]+)/gu), tests: matches(content, /\b(?:test|it)(?:\.(?:skip|only|todo))?\s*\(\s*["'`]([^"'`]+)/gu), assertions: count(content, /\bexpect\s*\(|\bassert(?:\.|\s*\()/gu), skipped: count(content, /\b(?:test|it|describe)\.(?:skip|todo)\s*\(/gu), focused: count(content, /\b(?:test|it|describe)\.only\s*\(/gu) }; }
function inventoryPython(path, content) { return { path, framework: content.includes("pytest") ? "pytest" : "unittest", suites: matches(content, /^class\s+(Test\w+)/gmu), tests: matches(content, /^\s*def\s+(test_\w+)/gmu), assertions: count(content, /\bassert\s+|\.assert[A-Z]\w*\s*\(/gu), skipped: count(content, /@pytest\.mark\.(?:skip|xfail)|@unittest\.skip/gu), focused: 0 }; }
function inventoryGo(path, content) { return { path, framework: "go test", suites: [], tests: matches(content, /^func\s+(Test\w+)\s*\(/gmu), assertions: count(content, /\bt\.(?:Error|Errorf|Fatal|Fatalf|Fail|FailNow)\s*\(/gu), skipped: count(content, /\bt\.Skip(?:f|Now)?\s*\(/gu), focused: 0 }; }
function inventoryRust(path, content) { return { path, framework: "cargo test", suites: [], tests: matches(content, /#\[test\]\s*(?:async\s+)?fn\s+(\w+)/gu), assertions: count(content, /\bassert(?:_eq|_ne)?!\s*\(/gu), skipped: count(content, /#\[ignore(?:\([^)]*\))?\]/gu), focused: 0 }; }
function matches(content, regex) { return [...content.matchAll(regex)].map((match) => match[1] ?? "unnamed"); }
function count(content, regex) { return [...content.matchAll(regex)].length; }
function sum(files, key) { return files.reduce((value, file) => value + file[key].length, 0); }
async function walk(directory) { const result = []; for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name))
        continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory())
        result.push(...await walk(path));
    else if (entry.isFile())
        result.push(path);
} return result; }
//# sourceMappingURL=inventory.js.map