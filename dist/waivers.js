import { parse } from "yaml";
import { showFile } from "./git.js";
export async function loadTrustedWaivers(repository, base) {
    let text;
    try {
        text = await showFile(repository, base, ".n0/waivers.yml");
    }
    catch {
        return [];
    }
    const document = parse(text);
    return (document?.waivers ?? []).flatMap((record) => {
        if (typeof record.rule !== "string" || typeof record.reason !== "string" || typeof record.approved_by !== "string" || typeof record.expires !== "string")
            return [];
        return [{ rule: record.rule, reason: record.reason, approvedBy: record.approved_by, expires: record.expires, ...(typeof record.path === "string" ? { path: record.path } : {}) }];
    });
}
export function applyWaivers(findings, waivers, now = new Date()) {
    for (const finding of findings) {
        const waiver = waivers.find((item) => item.rule === finding.ruleId && new Date(`${item.expires}T23:59:59Z`) >= now && (!item.path || (finding.path && globMatch(finding.path, item.path))));
        if (!waiver)
            continue;
        finding.waived = true;
        finding.severity = "info";
        finding.message = `${finding.message} WAIVED by ${waiver.approvedBy} until ${waiver.expires}: ${waiver.reason}`;
    }
}
function globMatch(path, pattern) {
    const regex = pattern.replace(/[.+^${}()|[\]\\]/gu, "\\$&").replaceAll("**", "\u0000").replaceAll("*", "[^/]*").replaceAll("\u0000", ".*");
    return new RegExp(`^${regex}$`, "u").test(path);
}
//# sourceMappingURL=waivers.js.map