---
description: "Create a new MCP server scaffold aligned with this repository (server class, index bootstrap, tool registration, and npm script checklist)."
name: "Create MCP Server"
argument-hint: "Server name, purpose, initial tools/factories, and whether to wire into an existing PEC agent"
agent: "agent"
---

Create a new MCP server in this repository following existing project patterns.

Use the user input as source of truth for:
- Server name and responsibility
- Initial tool list
- Required tool factories

Required output and actions:
1. Create a new folder in src/services/mcp/servers/<ServerName>/.
2. Add <ServerName>.ts extending McpServer with mcpServerConfig and tool registrations.
3. Add index.ts with StdioServerTransport bootstrap and startup/failure logging.
4. Create or reuse tool factory classes in src/services/mcp/toolFactories/.
5. Ensure import aliases follow project conventions (@services, @domain, etc).
6. Add or suggest a package.json script in the format mcp-server/<lorem-name>.
7. Provide validation checklist with commands and expected outcomes.

Implementation constraints:
- Follow patterns already used in ArtifactExtractor, MetricsExtractor, and DiagramGenerationTools.
- Keep server constructor dependencies explicit via interfaces/params.
- Register tools using server.registerTool(name, metadata, invoke).
- Reuse shared abstractions instead of duplicating infrastructure code.

Validation checklist:
- npm run build
- npm run mcp-server/<lorem-name>
- npm run test (or explain why skipped)

References:
- src/services/mcp/servers/ArtifactExtractor/ArtifactExtractor.ts
- src/services/mcp/servers/MetricsExtractor/MetricsExtractor.ts
- src/services/mcp/servers/ArtifactExtractor/index.ts
- src/services/mcp/toolFactories/
