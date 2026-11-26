import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PowerShellListDirectoriesToolFactory } from "@services/mcp/toolFactories/ListDirectoriesToolFactory.js";
import { DiagramGenerationToolsServer } from "./DiagramGenerationTools.js";
import { PowerShellDirectoryNavigationToolFactory } from "@services/mcp/toolFactories/DirectoryNavigationToolFactory.js";
import { PowerShellGetFileContentToolFactory } from "@services/mcp/toolFactories/GetFileContentToolFactory.js";
import { MermaidSyntaxValidatorToolFactory } from "@services/mcp/toolFactories/SyntaxValidatorToolFactory.js";

const server = new DiagramGenerationToolsServer({
  mermaidSyntaxValidatorToolFactory: new MermaidSyntaxValidatorToolFactory()
});

const transport = new StdioServerTransport();

server
  .connect(transport)
  .then(() => {
    console.error("Diagram Generation Tools MCP Server started successfully!");
  })
  .catch((error) => {
    console.error(`Fatal error during server initialization: ${error.message}`);
    process.exit(1);
  });
