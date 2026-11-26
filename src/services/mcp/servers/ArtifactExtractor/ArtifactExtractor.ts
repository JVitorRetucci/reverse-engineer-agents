import { ServerOptions } from "@modelcontextprotocol/sdk/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { DirectoryNavigationToolFactory, PowerShellDirectoryNavigationToolFactory } from "@services/mcp/toolFactories/DirectoryNavigationToolFactory.js";
import { GetFileContentToolFactory } from "@services/mcp/toolFactories/GetFileContentToolFactory.js";
import { ListDirectoriesToolFactory } from "@services/mcp/toolFactories/ListDirectoriesToolFactory.js";
import { SearchInFileSystemToolFactory } from "@services/mcp/toolFactories/SearchInFileSystemToolFactory.js";

interface IArtifactExtractorServerParams {
  listDirectoriesToolFactory: ListDirectoriesToolFactory;
  directoryNavigationToolFactory: DirectoryNavigationToolFactory;
  getFileContentToolFactory: GetFileContentToolFactory;
  searchInFileSystemToolFactory: SearchInFileSystemToolFactory;
  linuxListDirectoriesToolFactory: ListDirectoriesToolFactory;
  linuxDirectoryNavigationToolFactory: DirectoryNavigationToolFactory;
  linuxGetFileContentToolFactory: GetFileContentToolFactory;
  linuxSearchInFileSystemToolFactory: SearchInFileSystemToolFactory;
}

export const mcpServerConfig: {
  serverInfo: Implementation;
  options?: ServerOptions;
} = {
  serverInfo: {
    name: "ArtifactExtractor",
    version: "0.1",
  },
  options: {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
};

export class ArtifactExtractorServer extends McpServer {
  constructor({
    listDirectoriesToolFactory,
    directoryNavigationToolFactory,
    getFileContentToolFactory,
    searchInFileSystemToolFactory,
    linuxListDirectoriesToolFactory,
    linuxDirectoryNavigationToolFactory,
    linuxGetFileContentToolFactory,
    linuxSearchInFileSystemToolFactory,
  }: IArtifactExtractorServerParams) {
    super(mcpServerConfig.serverInfo);

    const isLinux = process.platform === "linux";
    const tools = isLinux
      ? [
          linuxListDirectoriesToolFactory.createToolClass(),
          linuxDirectoryNavigationToolFactory.createToolClass(),
          linuxGetFileContentToolFactory.createToolClass(),
          linuxSearchInFileSystemToolFactory.createToolClass(),
        ]
      : [
          listDirectoriesToolFactory.createToolClass(),
          directoryNavigationToolFactory.createToolClass(),
          getFileContentToolFactory.createToolClass(),
          searchInFileSystemToolFactory.createToolClass(),
        ];

    for (const tool of tools) {
      super.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: tool.parametersSchema,
        },
        tool.invoke.bind(tool),
      );
    }
  }
}
