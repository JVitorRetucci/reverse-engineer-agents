import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PowerShellListDirectoriesToolFactory } from "@services/mcp/toolFactories/ListDirectoriesToolFactory.js";
import { ArtifactExtractorServer } from "./ArtifactExtractor.js";
import { PowerShellDirectoryNavigationToolFactory } from "@services/mcp/toolFactories/DirectoryNavigationToolFactory.js";

const server = new ArtifactExtractorServer({
  listDirectoriesToolFactory: new PowerShellListDirectoriesToolFactory(),
  directoryNavigationToolFactory: new PowerShellDirectoryNavigationToolFactory(),
});

const transport = new StdioServerTransport();

server
  .connect(transport)
  .then(() => {
    console.error("Artifact Extractor MCP Server started successfully!");
  })
  .catch((error) => {
    console.error(`Fatal error during server initialization: ${error.message}`);
    process.exit(1);
  });
