# Project Guidelines

## Code Style
- Use TypeScript ESM with strict typing (`tsconfig.json` uses `strict: true`).
- Prefer path aliases over deep relative imports: `@core/*`, `@agents/*`, `@domain/*`, `@services/*`, `@root/*`.
- Keep agent files organized as `src/agents/<agent-name>/agent.ts`, `executor.ts`, and `nodes/`.
- Reuse shared modules in `src/agents/common/` for state, node, LLM service, and MCP client logic.

## Architecture
- This project is config-driven: agent lifecycle is defined in `agents.config.json` and orchestrated by `src/core/AgentRegistry.ts`.
- `src/main.ts` should remain a thin bootstrap that starts/stops all configured agents.
- Each agent executor is loaded dynamically from `executorPath` + `executorClass` and must implement the A2A `AgentExecutor` contract.
- Keep boundaries clear:
  - `src/core/`: orchestration, factory, and cross-cutting errors.
  - `src/agents/`: agent-specific behavior and LangGraph flows.
  - `src/services/mcp/`: MCP servers/tooling.
  - `src/domain/`: domain contracts and types.
- For architecture details and flow diagrams, see `docs/ARCHITECTURE.md`.

## Build and Test
- Install dependencies: `npm install`
- Start all agents in dev mode: `npm run dev`
- Run A2A client in dev mode: `npm run dev_client`
- Build TypeScript: `npm run build`
- Run tests: `npm run test`
- Run coverage: `npm run coverage`
- Validate agent configuration before large changes: `npm run diagnose`
- Run MCP servers individually when needed:
  - `npm run mcp-server/metrics-extractor`
  - `npm run mcp-server/artifact-extractor`
  - `npm run mcp-server/diagram-generation-tools`

## Conventions
- Add new agents by creating executor/agent files first, then registering them in `agents.config.json`.
- Keep the agent-role taxonomy explicit when designing new executors:
  - `Main` agent: system entry point and user-facing orchestrator; it should delegate work to sub-agents and should not call MCP/external tools directly.
  - `PEC` (Primary Extractor Component) agents: specialized workers that interact with MCP tools and extract data from the target environment.
  - `Intermediate` agents (planned): bridge/orchestration layer between `Main` and `PEC` agents for decomposition, routing, and result consolidation.
- Use port ranges by role to keep allocation predictable:
  - `Main` agent runs on port `4000` by default.
  - `Intermediate` agents should use ports in the `41xx` range.
  - `PEC` agents should use ports in the `42xx` range.
- Keep `id` and `port` unique per agent; duplicated ports/ids break startup.
- Keep `executorPath` and `executorClass` aligned with real exported symbols; loading is runtime-dynamic.
- Prefer updating shared templates and docs when introducing a new agent pattern:
  - `src/agents/TEMPLATE_EXECUTOR.example.ts`
  - `docs/Agents/ADDING_NEW_AGENTS.md`
- When touching orchestration or config shape, run `npm run diagnose` and `npm run test` before finishing.

## Common Pitfalls
- Missing or incorrect `.env` values for LLM/MCP dependencies can cause runtime failures that look like tool timeouts.
- `agents.config.json` is required at runtime; keep it available in root for both dev and built execution flows.
- Large message histories in graph state can degrade behavior; keep state updates bounded in node logic.