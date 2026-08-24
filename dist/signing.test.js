import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateSigningKeyPair, signHash, verifySignature } from "./signing.js";
test("generates and verifies Ed25519 proof signatures", async () => {
    const directory = await mkdtemp(join(tmpdir(), "n0-signing-"));
    try {
        const privateKey = join(directory, "private.pem");
        const publicKey = join(directory, "public.pem");
        await generateSigningKeyPair(privateKey, publicKey);
        const signature = await signHash("sha256:abc", privateKey);
        assert.equal(verifySignature(signature), true);
        assert.equal(verifySignature({ ...signature, signedHash: "sha256:changed" }), false);
    }
    finally {
        await rm(directory, { recursive: true, force: true });
    }
});
//# sourceMappingURL=signing.test.js.map