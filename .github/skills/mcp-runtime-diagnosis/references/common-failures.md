# Common MCP Runtime Failures Checklist

## Configuration
- `agents.config.json` exists at repository root.
- Agent `id` and `port` are unique.
- `executorPath` and `executorClass` point to real exports.
- Agent role is consistent with behavior:
  - Main delegates only.
  - PEC executes MCP/tool calls.

## Environment
- `.env` exists and required variables are set.
- LLM provider settings are valid for the selected default service.
- Paths used by MCP servers are valid for the local OS.

## Runtime
- Target MCP server starts with the corresponding `npm run mcp-server/*` command.
- No port conflicts for agent or MCP server processes.
- No immediate process exit caused by import/runtime errors.

## Validation
- `npm run diagnose` passes without blocking issues.
- `npm run test` runs (or blocker is explicitly documented).
