# GitHub Action integration

Pin every third-party Action to a full commit SHA. This example verifies a pull
request, updates one persistent comment and uploads the Proof Pack as an artifact:

```yaml
name: N0 Verify
on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
        with:
          fetch-depth: 0
      - id: n0
        uses: your-org/n0-verify@<PINNED_N0_COMMIT>
        with:
          base: ${{ github.event.pull_request.base.sha }}
          head: ${{ github.event.pull_request.head.sha }}
          mode: worktree
          strict: true
          github_token: ${{ github.token }}
      - if: always() && steps.n0.outputs.proof_directory != ''
        uses: actions/upload-artifact@<PINNED_UPLOAD_ARTIFACT_COMMIT>
        with:
          name: n0-proof
          path: ${{ steps.n0.outputs.proof_directory }}
          if-no-files-found: error
```

Do not run untrusted code under `pull_request_target`. Fork pull requests are
automatically reduced to audit mode unless `allow-fork-execution: true` is set;
that override should only be used with a separately hardened runner and no
secrets. The Action returns exit code 1 for a policy block, 2 for inconclusive
evidence and 3 for configuration or internal errors.
