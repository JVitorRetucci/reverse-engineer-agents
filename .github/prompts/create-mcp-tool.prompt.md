---
description: "Create a new MCP tool and factory using repository conventions (zod schema, BasicTool inheritance, invoke contract, and server wiring guidance)."
name: "Create MCP Tool"
argument-hint: "Target server, tool name, input schema, behavior, execution backend (PowerShell/other), and expected output"
agent: "agent"
---

Create a new MCP tool for this repository with production-ready structure.

Use the user input as source of truth for:
- Target MCP server
- Tool name and purpose
- Input schema and runtime behavior

Required output and actions:
1. Create tool file under src/services/mcp/servers/<ServerName>/tools/<ToolName>.ts.
2. Implement the tool by extending BasicTool with a Zod schema.
3. Implement invoke() returning CallToolResult with success and error cases.
4. Create or update tool factory in src/services/mcp/toolFactories/.
5. Wire the tool registration into the corresponding server class.
6. Add or update tests when similar tool specs exist in that server.

Implementation constraints:
- Follow the pattern used by ListDirectoriesTool and other existing tools.
- Keep schema descriptions clear for tool discoverability.
- Return MCP-compatible result payloads ({ content, isError? }).
- Keep execution backend explicit (for example, PowerShell on Windows when needed).

Validation checklist:
- npm run build
- npm run mcp-server/<target-server-script>
- npm run test (or explain why skipped)

References:
- src/services/mcp/servers/ArtifactExtractor/tools/ListDirectoriesTool.ts
- src/services/mcp/servers/ArtifactExtractor/tools/GetFileContentTool.ts
- src/services/mcp/toolFactories/ListDirectoriesToolFactory.ts
- src/domain/mcp/servers/tools/BasicTool.ts
