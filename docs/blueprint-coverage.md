# Blueprint coverage and deployment boundary

This repository implements the complete open-core product surface described by
the N0 Verify blueprint: CLI and demo, trusted base and organization policy,
Git/diff classification, deterministic claims, requirements and waivers,
audit/worktree/container execution, sanitized environments, base/head comparison,
test inventory, tamper detectors, four-way matrix, counterfactual and changed-line
mutation, evidence graph, Proof Pack/hash/signature verification, HTML/SARIF/badge,
GitHub Action, JavaScript/Python/Go/Rust adapters, benchmark, plugin/runner APIs,
MCP-compatible stdio tools, local run listing, schemas, security guidance and
release automation.

The following are deployment operations, not repository code, and therefore
cannot be truthfully marked as live from a local checkout:

- reserving the GitHub organization, npm package, domain and trademarks;
- publishing an npm release or GitHub release;
- executing hosted macOS/Linux/Windows and GitHub checks in those services;
- deploying a remote ephemeral-runner control plane;
- operating cloud SSO, RBAC, tenant storage, retention and compliance exports;
- issuing CI identity/keyless attestations from a configured production issuer;
- deploying GitLab or Bitbucket platform-specific pipelines.

Their versioned contracts and secure integration paths are present, but activating
them requires account ownership, credentials, infrastructure and an explicit
deployment decision. Local Ed25519 proof signing and npm provenance release
automation cover the open-core signing path without claiming those services are
already running.

## Local acceptance evidence

- TypeScript strict check and the full automated suite run with `npm run check`
  and `npm test`.
- N0 Bench contains 20 deceptive, 10 honest and 10 ambiguous cases.
- `npm pack --dry-run` proves the package boundary and excludes compiled tests.
- The Action bundle is smoke-tested without `node_modules`.
- JavaScript and Python use temporary Git repositories for four-way integration
  tests; Go and Rust adapters have deterministic detection tests.
- Proof Pack tests verify hashes, tamper detection and Ed25519 signatures.
- Container flags are contract-tested. A real container run remains conditional
  on Docker or Podman being installed on the executing machine.

The benchmark is a deterministic control suite, not an independent empirical
claim about all public repositories. Its precision/recall numbers must always be
reported together with the case count and corpus description.
