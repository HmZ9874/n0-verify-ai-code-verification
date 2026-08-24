# Agent and CI integrations

N0 Verify is agent-neutral. Ask an agent to write its completion summary to a
Markdown file and pass it as untrusted claims:

```bash
n0-verify check --base origin/main --claims agent-summary.md
```

This works with Claude Code, Codex, Cursor, Gemini CLI and other tools because
the verifier reads the repository and Git history, not an agent-specific session.

For iterative workflows:

```text
Agent writes code -> N0 Verify checks -> findings return to agent -> retry
```

The stdio server exposes `n0_check` and `n0_doctor` tools for MCP-compatible
clients. The GitHub Action emits policy outputs and one persistent PR comment.
