import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { LinuxListDirectoriesToolFactory, PowerShellListDirectoriesToolFactory } from "@services/mcp/toolFactories/ListDirectoriesToolFactory.js";
import { ArtifactExtractorServer } from "./ArtifactExtractor.js";
import { LinuxDirectoryNavigationToolFactory, PowerShellDirectoryNavigationToolFactory } from "@services/mcp/toolFactories/DirectoryNavigationToolFactory.js";
import { LinuxGetFileContentToolFactory, PowerShellGetFileContentToolFactory } from "@services/mcp/toolFactories/GetFileContentToolFactory.js";
import { LinuxSearchInFileSystemToolFactory, PowerShellSearchInFileSystemToolFactory } from "@services/mcp/toolFactories/SearchInFileSystemToolFactory.js";

const server = new ArtifactExtractorServer({
  listDirectoriesToolFactory: new PowerShellListDirectoriesToolFactory(),
  directoryNavigationToolFactory: new PowerShellDirectoryNavigationToolFactory(),
  getFileContentToolFactory: new PowerShellGetFileContentToolFactory(),
  searchInFileSystemToolFactory: new PowerShellSearchInFileSystemToolFactory(),
  linuxListDirectoriesToolFactory: new LinuxListDirectoriesToolFactory(),
  linuxDirectoryNavigationToolFactory: new LinuxDirectoryNavigationToolFactory(),
  linuxGetFileContentToolFactory: new LinuxGetFileContentToolFactory(),
  linuxSearchInFileSystemToolFactory: new LinuxSearchInFileSystemToolFactory(),
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
