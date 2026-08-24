# Privacy, secrets and telemetry

N0 Verify is local-first. The CLI has no account requirement, analytics client,
telemetry endpoint or source-upload path. Proof Packs stay under `.n0/runs/`
unless the caller explicitly copies or uploads them.

Repository commands receive an allowlisted environment. Cloud credentials,
GitHub tokens, model API keys, SSH agent sockets and database URLs are not
inherited. Container mode additionally uses a read-only source mount, a disposable
in-memory workspace, a read-only root filesystem, a non-root numeric user,
dropped capabilities, a PID limit, CPU/memory limits and no network by default.

Proof Packs intentionally contain diffs, commands and logs. Treat them as source
artifacts: review retention and access policy before uploading them. The GitHub
Action only writes a PR comment when a token is explicitly provided, and fork
pull requests fall back to audit-only mode unless execution is deliberately
enabled.

If optional telemetry is added in the future it must be opt-in, documented and
must not contain source code, diffs, logs, file contents, environment values or
secrets.
