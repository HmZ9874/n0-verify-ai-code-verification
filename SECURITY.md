# Security policy

## Threat model

Repository content, dependency manifests, build scripts, test code and candidate
configuration must be treated as potentially hostile. N0 Verify therefore has
three execution modes:

- `audit`: reads Git objects and source text without executing repository code.
- `worktree`: prevents contamination by uncommitted files, but is **not** a
  security sandbox.
- `container`: runs commands as a non-root user, with resource limits and no
  network by default.

The verifier filters common credential variables from executed commands. Never
mount SSH keys, cloud credentials, Docker sockets or production secrets into an
untrusted verification environment.

## GitHub Actions

- Use `pull_request`, not `pull_request_target`, when candidate code executes.
- Use minimal permissions and pin third-party actions to full commit hashes.
- Do not pass secrets to workflows triggered by forks.
- Trust policy and waivers only from the base commit.
- Treat uploaded logs and reports as potentially sensitive artifacts.

## Reporting vulnerabilities

Do not open a public issue for a vulnerability that could expose repository code,
credentials or runner escape details. Contact the maintainers privately and
include a minimal reproduction, affected version and suggested impact.
