# Architecture

```text
CLI / GitHub Action / stdio tool server
                 |
          Verification core
     +-----------+-------------+
     |           |             |
 Trusted      Language      Policy and
 Git state    adapters      requirements
     |           |             |
     +----- Execution matrix --+
                 |
       Findings + evidence graph
                 |
       Verdict + Proof Pack + SARIF
```

The trusted policy resolver reads configuration from the base commit before the
candidate configuration is considered. Static analysis runs before any repository
code. Runtime commands are executed only in worktree or container mode.

The matrix composes base code (`C0`), candidate code (`C1`), base tests (`T0`)
and candidate tests (`T1`). Composition failures are reported as inconclusive;
they are never silently converted into evidence of correctness.
