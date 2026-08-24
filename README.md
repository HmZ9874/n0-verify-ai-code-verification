# N0 Verify — Independent Verification for AI-Written Code

**English** | [简体中文](README.zh-CN.md)

> AI said “done.” N0 Verify tests the evidence.

N0 Verify is a local-first, open-source verification system for agent-written
code. It treats completion messages as untrusted input and independently checks
the repository, trusted base policy, test integrity, base/head behavior and
counterfactual evidence.

```bash
npx n0-verify demo
```

No account, API key or source upload is required.

中文用户请参阅 [`docs/使用说明.md`](docs/使用说明.md)。

## What it checks

- deleted, skipped, todo and focused tests
- removed or high-confidence weakened assertions
- test commands that mask failing exit codes
- coverage-threshold and test-discovery reductions
- base health versus candidate health
- the four-way `C0T0 / C1T0 / C0T1 / C1T1` test matrix
- whether changed tests still pass on the base implementation
- mandatory requirements and their evidence types
- security-sensitive and CI configuration changes
- reproducible, hash-verifiable Proof Packs

N0 Verify separates epistemic status from merge policy:

| Evidence | Meaning |
| --- | --- |
| `SUPPORTED` | Required evidence supports the scoped claim |
| `CONTRADICTED` | Reproducible evidence conflicts with it |
| `INCONCLUSIVE` | Available evidence is insufficient |

| Decision | Meaning |
| --- | --- |
| `PASS` | Trusted policy permits the change |
| `WARN` | Reviewable findings exist |
| `BLOCK` | A blocking policy obligation failed |

## Quick start

```bash
npm install
npm run build
node dist/cli-entry.js init
node dist/cli-entry.js check --base HEAD~1
```

`check` defaults to the mode in `.n0/n0.config.yml`. Fresh configurations use
audit-only mode and do not execute repository code.

```bash
# Clean worktrees; not a security boundary
n0-verify check --base origin/main --mode worktree

# Docker isolation, no network by default
n0-verify check --base origin/main --mode container

# Explicit command override (execution modes only; ignored in audit mode)
n0-verify check --base origin/main --mode worktree --test-command "node --test"
```

## Commands

```text
n0-verify init [--force]
n0-verify check [--base REF] [--head REF] [--mode audit|worktree|container]
n0-verify demo [--json]
n0-verify doctor [--json]
n0-verify explain RULE-ID
n0-verify report [--run ID] [--format html|json|sarif]
n0-verify baseline create|inspect|update
n0-verify proof keygen
n0-verify proof verify DIRECTORY
n0-verify bench [--json]
n0-verify serve
```

## Trusted policy

For a pull request, N0 Verify reads `.n0/n0.config.yml`, requirements and
waivers from the base commit. A candidate cannot weaken the policy governing its
own verification run. An organization policy can add immutable constraints via
`N0_ORG_POLICY`; project policy cannot relax them.

```yaml
version: 1
execution:
  mode: container
  network: false
  timeout_seconds: 120
commands:
  install: npm ci --ignore-scripts
  build: npm run build
  typecheck: npm run check
  test: npm test
policies:
  block_on:
    - test_skip_added
    - focused_test_added
    - test_failure_masked
    - non_discriminating_test
matrix:
  enabled: true
negative_control:
  enabled: true
  max_mutants: 10
report:
  html: true
  json: true
  sarif: true
```

## Proof Pack

Each full check can generate `.n0/runs/<run-id>/` containing:

- canonical `proof.json` and `manifest.json`
- command evidence and stdout/stderr hashes
- findings, changed files, requirement results and matrix evidence
- standalone responsive `report.html` and status badge
- SARIF output
- optional Ed25519 signature

```bash
n0-verify proof keygen
n0-verify check --signing-key .n0/signing-key.pem
n0-verify proof verify .n0/runs/<run-id>
```

## GitHub Action

```yaml
permissions:
  contents: read

steps:
  - uses: actions/checkout@<pinned-commit>
    with:
      fetch-depth: 0
  - uses: HmZ9874/n0-verify@<pinned-commit>
    with:
      base: ${{ github.event.pull_request.base.sha }}
      head: ${{ github.event.pull_request.head.sha }}
      mode: worktree
```

The bundled Action runs without installing this repository's dependencies.
Fork pull requests automatically fall back to audit mode unless execution is
explicitly enabled. Do not use `pull_request_target` to execute untrusted
pull-request code. See [`SECURITY.md`](SECURITY.md) for the threat model.

## Languages and extension points

Built-in project detection and deterministic commands cover JavaScript/
TypeScript, Python, Go and Rust. JavaScript and Python have full integration
fixtures for the four-way matrix and changed-line mutation; Go and Rust provide
deterministic detection, inventory and execution adapters.

Adapters and plugins are exported from `n0-verify/adapter-sdk` and
`n0-verify/plugin-sdk`. Remote runner contracts and local Proof Pack dashboard
helpers are exported from `n0-verify/remote-runner` and `n0-verify/dashboard`.
See [`docs/`](docs/) for architecture, schemas, organization policy, integrations
and the remote-runner protocol.

## Development

```bash
npm run lint
npm run check
npm test
npm run bench
npm pack --dry-run
```

N0 Verify verifies whether scoped claims have sufficient reproducible evidence;
it does not claim mathematical proof of complete program correctness. Hosted
runner operation, SSO/RBAC and publishing require infrastructure and accounts
outside this repository; the repository contains their versioned contracts and
integration boundaries.
