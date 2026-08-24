# Organization policy

CI administrators can set `N0_ORG_POLICY` to an immutable policy file mounted by
the runner. Organization policy has higher precedence than base-branch policy and
candidate configuration.

```bash
N0_ORG_POLICY=/etc/n0/policy.yml n0-verify check --base origin/main
```

The policy file should be read-only to the job and managed through the
organization's normal approval process. A candidate pull request must never be
allowed to write this path.
