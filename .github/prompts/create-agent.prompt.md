---
description: "Create a new project agent end-to-end (files + registration + validation checklist). Use for adding Main, PEC, or Intermediate agents in this repository."
name: "Create New Agent"
argument-hint: "Agent goal, role (Main|PEC|Intermediate), id, name, port, tools, and expected capabilities"
agent: "agent"
---

Create a new agent for this repository following project conventions.

Use the user input as source of truth for:
- Agent role: Main, PEC, or Intermediate
- Agent id, display name, and port
- High-level responsibility and required capabilities

Required output and actions:
1. Create or update agent files under `src/agents/<agent-name>/`.
2. Ensure folder structure includes `agent.ts`, `executor.ts`, and `nodes/`.
3. Register the agent in `agents.config.json` with unique `id` and `port`.
4. Ensure `executorPath` and `executorClass` match real exported symbols.
5. Reuse shared modules from `src/agents/common/` when possible.
6. Run and report a validation checklist using:
   - `npm run diagnose`
   - `npm run test` (or explain why not executed)

Role constraints:
- Main: orchestrates and delegates; does not call MCP/external tools directly.
- PEC: interacts with MCP tools and extracts target-environment data.
- Intermediate: bridges Main and PEC with decomposition, routing, and consolidation.

References:
- `src/agents/TEMPLATE_EXECUTOR.example.ts`
- `docs/Agents/ADDING_NEW_AGENTS.md`
- `.github/copilot-instructions.md`
