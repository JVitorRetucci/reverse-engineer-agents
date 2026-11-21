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

    const listDirectoriesTool = listDirectoriesToolFactory.createToolClass();
    const directoryNavigationTool = directoryNavigationToolFactory.createToolClass();
    const getFileContentTool = getFileContentToolFactory.createToolClass();
    const searchInFileSystemTool = searchInFileSystemToolFactory.createToolClass();
    const linuxListDirectoriesTool = linuxListDirectoriesToolFactory.createToolClass();
    const linuxDirectoryNavigationTool = linuxDirectoryNavigationToolFactory.createToolClass();
    const linuxGetFileContentTool = linuxGetFileContentToolFactory.createToolClass();
    const linuxSearchInFileSystemTool = linuxSearchInFileSystemToolFactory.createToolClass();
    const linuxTools = [
      linuxListDirectoriesTool,
      linuxDirectoryNavigationTool,
      linuxGetFileContentTool,
      linuxSearchInFileSystemTool,
    ];

    super.registerTool(
      listDirectoriesTool.name,
      {
        description: listDirectoriesTool.description,
        inputSchema: listDirectoriesTool.parametersSchema,
      },
      listDirectoriesTool.invoke.bind(listDirectoriesTool)
    );

    super.registerTool(
      directoryNavigationTool.name,
      {
        description: directoryNavigationTool.description,
        inputSchema: directoryNavigationTool.parametersSchema,
      },
      directoryNavigationTool.invoke.bind(directoryNavigationTool)
    );

    super.registerTool(
      getFileContentTool.name,
      {
        description: getFileContentTool.description,
        inputSchema: getFileContentTool.parametersSchema,
      },
      getFileContentTool.invoke.bind(getFileContentTool)
    );

    super.registerTool(
      searchInFileSystemTool.name,
      {
        description: searchInFileSystemTool.description,
        inputSchema: searchInFileSystemTool.parametersSchema,
      },
      searchInFileSystemTool.invoke.bind(searchInFileSystemTool)
    );

    for (const tool of linuxTools) {
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
