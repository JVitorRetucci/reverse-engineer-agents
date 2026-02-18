import { ServerOptions } from "@modelcontextprotocol/sdk/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { DirectoryNavigationToolFactory, PowerShellDirectoryNavigationToolFactory } from "@services/mcp/toolFactories/DirectoryNavigationToolFactory.js";
import { GetFileContentToolFactory } from "@services/mcp/toolFactories/GetFileContentToolFactory.js";
import { ListDirectoriesToolFactory } from "@services/mcp/toolFactories/ListDirectoriesToolFactory.js";

interface IArtifactExtractorServerParams {
  listDirectoriesToolFactory: ListDirectoriesToolFactory;
  directoryNavigationToolFactory: DirectoryNavigationToolFactory;
  getFileContentToolFactory: GetFileContentToolFactory;
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
  constructor({ listDirectoriesToolFactory, directoryNavigationToolFactory, getFileContentToolFactory }: IArtifactExtractorServerParams) {
    super(mcpServerConfig.serverInfo);

    const listDirectoriesTool = listDirectoriesToolFactory.createToolClass();
    const directoryNavigationTool = directoryNavigationToolFactory.createToolClass();
    const getFileContentTool = getFileContentToolFactory.createToolClass();

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
  }
}
