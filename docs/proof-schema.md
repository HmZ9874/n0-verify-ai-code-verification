# Proof schema

Proof Packs use schema version `1.0`. `manifest.json` binds the base/head commits,
policy hash, proof hash and hashes of all artifacts. JSON is canonicalized by
recursively sorting object keys before hashing.

Optional Ed25519 signatures sign `manifest.proofHash`. Hash verification remains
available for unsigned local packs. A signature proves possession of a key; the
trustworthiness of that key or CI identity is an external policy decision.
