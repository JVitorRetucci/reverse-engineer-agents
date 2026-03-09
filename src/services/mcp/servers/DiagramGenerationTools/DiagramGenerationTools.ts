import { ServerOptions } from "@modelcontextprotocol/sdk/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { MermaidSyntaxValidatorToolFactory } from "@services/mcp/toolFactories/SyntaxValidatorToolFactory.js";

interface IDiagramGenerationToolsServerParams {
  mermaidSyntaxValidatorToolFactory: MermaidSyntaxValidatorToolFactory;
}

export const mcpServerConfig: {
  serverInfo: Implementation;
  options?: ServerOptions;
} = {
  serverInfo: {
    name: "DiagramGenerationTools",
    version: "0.1",
  },
  options: {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
};

export class DiagramGenerationToolsServer extends McpServer {
  constructor({ mermaidSyntaxValidatorToolFactory }: IDiagramGenerationToolsServerParams) {
    super(mcpServerConfig.serverInfo);

    const listDirectoriesTool = mermaidSyntaxValidatorToolFactory.createToolClass();

    super.registerTool(
      listDirectoriesTool.name,
      {
        description: listDirectoriesTool.description,
        inputSchema: listDirectoriesTool.parametersSchema,
      },
      listDirectoriesTool.invoke.bind(listDirectoriesTool)
    );
  }
}
