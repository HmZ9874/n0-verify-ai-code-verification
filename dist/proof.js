import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { produceProofPack as produceCore, verifyProofPack, canonicalJson } from "./proof-core.js";
export { verifyProofPack, canonicalJson };
export async function produceProofPack(options) {
    const pack = await produceCore(options);
    await writeFile(join(pack.directory, "badge.svg"), renderBadge(options.result.decision), "utf8");
    return pack;
}
export function renderBadge(decision) {
    const color = decision === "PASS" ? "#16a34a" : decision === "WARN" ? "#d97706" : "#dc2626";
    const label = decision === "PASS" ? "N0 Verified" : decision === "WARN" ? "N0 Warnings" : "N0 Blocked";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="20" role="img" aria-label="${label}"><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".15"/><stop offset="1" stop-opacity=".1"/></linearGradient><rect width="128" height="20" rx="3" fill="${color}"/><rect width="128" height="20" rx="3" fill="url(#s)"/><text x="64" y="14" fill="#fff" text-anchor="middle" font-family="Verdana,sans-serif" font-size="11">${label}</text></svg>`;
}
//# sourceMappingURL=proof.js.map