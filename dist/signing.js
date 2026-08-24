import { createHash, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
export async function generateSigningKeyPair(privatePath, publicPath) {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    await mkdir(dirname(privatePath), { recursive: true });
    await mkdir(dirname(publicPath), { recursive: true });
    await writeFile(privatePath, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
    await writeFile(publicPath, publicKey.export({ type: "spki", format: "pem" }), "utf8");
}
export async function signHash(hash, privateKeyPath) {
    const privateKey = await readFile(privateKeyPath, "utf8");
    const publicKey = createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString();
    return { algorithm: "Ed25519", publicKey, signature: sign(null, Buffer.from(hash, "utf8"), privateKey).toString("base64"), signedHash: hash };
}
export function verifySignature(signature) {
    return verify(null, Buffer.from(signature.signedHash, "utf8"), signature.publicKey, Buffer.from(signature.signature, "base64"));
}
export function sha256(value) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }
//# sourceMappingURL=signing.js.map