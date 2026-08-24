export interface ProofSignature {
    algorithm: "Ed25519";
    publicKey: string;
    signature: string;
    signedHash: string;
}
export declare function generateSigningKeyPair(privatePath: string, publicPath: string): Promise<void>;
export declare function signHash(hash: string, privateKeyPath: string): Promise<ProofSignature>;
export declare function verifySignature(signature: ProofSignature): boolean;
export declare function sha256(value: string | Buffer): string;
