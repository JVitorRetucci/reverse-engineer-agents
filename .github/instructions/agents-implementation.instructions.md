---
description: "Use when creating or refactoring agent executors, LangGraph nodes, or agent state in src/agents. Covers Main vs PEC role boundaries, tool usage constraints, and graph-state safety."
name: "Agents Implementation Guidelines"
applyTo: "src/agents/**/*.ts"
---

# Agents Implementation Guidelines

- Respect the agent taxonomy:
  - Main agent is the user-facing orchestrator and should delegate tasks to sub-agents.
  - Main agent must not call MCP or external tools directly.
  - PEC agents are the components that call MCP tools and extract data from target environments.
  - Intermediate agents are a planned orchestration layer between Main and PEC; design for future insertion points.

- Use port ranges by role when registering agents in `agents.config.json`:
  - Main agent runs on port `4000` by default.
  - Intermediate agents should use ports in the `41xx` range.
  - PEC agents should use ports in the `42xx` range.

- Keep shared logic in `src/agents/common/` whenever behavior can be reused across two or more agents.
- Keep each agent folder structured as `agent.ts`, `executor.ts`, and `nodes/`.
- Prefer state schemas in `src/agents/common/states/` using Zod with clear optional fields and safe defaults.

- Keep graph state bounded:
  - Avoid unbounded growth in `messages` and similar history fields.
  - Trim or summarize state payloads before returning from node chains.

- When introducing a new executor pattern:
  - Align with `src/agents/TEMPLATE_EXECUTOR.example.ts`.
  - Update `docs/Agents/ADDING_NEW_AGENTS.md` if the pattern changes how agents should be created.
