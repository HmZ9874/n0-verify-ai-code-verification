# Agent integration guides

N0 Verify is deliberately session-neutral. For Claude Code, Codex, Cursor,
Gemini CLI or another coding agent, use the same handoff contract:

1. Ask the authoring agent to save its completion claims as Markdown, YAML or
   JSON without editing the trusted base policy.
2. End the authoring process.
3. Run N0 Verify from a separate process or CI identity.
4. Feed only the findings and requirement results back for the next iteration.

```bash
n0-verify check --base origin/main --claims agent-summary.md --mode worktree
```

MCP-compatible hosts can launch `n0-verify serve` and call `n0_check`,
`n0_doctor`, `n0_runs` and `n0_proof_verify`. This interface does not grant an
agent authority to change policy or waive its own findings.
