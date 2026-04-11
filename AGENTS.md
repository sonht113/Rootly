<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Subagent Workflow

This repository uses a fixed three-subagent workflow:

- `analyst` for design and bug analysis, plus implementation-ready planning
- `coder` for implementation from the latest analyst plan
- `reviewer` for diff review after coder finishes

Detailed operating rules live in `SUBAGENTS.md`.
When delegating work in this repo, follow that workflow instead of ad-hoc role definitions.
