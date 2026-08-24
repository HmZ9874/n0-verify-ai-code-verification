export function parseDiffLines(patch) {
    const result = [];
    let path = "";
    let oldLine = 0;
    let newLine = 0;
    for (const raw of patch.split(/\r?\n/u)) {
        if (raw.startsWith("+++ b/")) {
            path = raw.slice(6);
            continue;
        }
        const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/u.exec(raw);
        if (hunk) {
            oldLine = Number(hunk[1]);
            newLine = Number(hunk[2]);
            continue;
        }
        if (!path || raw.startsWith("---") || raw.startsWith("+++"))
            continue;
        if (raw.startsWith("+")) {
            result.push({ path, line: newLine, kind: "added", content: raw.slice(1) });
            newLine += 1;
        }
        else if (raw.startsWith("-")) {
            result.push({ path, line: oldLine, kind: "removed", content: raw.slice(1) });
            oldLine += 1;
        }
        else {
            oldLine += 1;
            newLine += 1;
        }
    }
    return result;
}
//# sourceMappingURL=diff.js.map