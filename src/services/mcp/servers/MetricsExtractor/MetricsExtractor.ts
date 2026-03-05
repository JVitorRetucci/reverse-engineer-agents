import { ServerOptions } from "@modelcontextprotocol/sdk/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { MetricsToolFactory } from "services/mcp/toolFactories/MetricsToolFactory.js";
import { SonargraphBuildToolFactory } from "@services/mcp/toolFactories/SonargraphToolFactory.js";

interface IMetricsExtractorServerParams {
  metricsToolFactory: MetricsToolFactory;
  sonargraphToolFactory: SonargraphBuildToolFactory;
}

export const mcpServerConfig: {
  serverInfo: Implementation;
  options?: ServerOptions;
} = {
  serverInfo: {
    name: "MetricsExtractor",
    version: "0.1",
  },
  options: {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
};

export class MetricsExtractorServer extends McpServer {
  constructor({ metricsToolFactory, sonargraphToolFactory }: IMetricsExtractorServerParams) {
    super(mcpServerConfig.serverInfo);

    const metricsTool = metricsToolFactory.createToolClass();
    const sonargraphTool = sonargraphToolFactory.createToolClass();

    super.registerTool(
      metricsTool.name,
      {
        description: metricsTool.description,
        inputSchema: metricsTool.parametersSchema,
      },
      metricsTool.invoke.bind(metricsTool)
    );

    super.registerTool(
      sonargraphTool.name,
      {
        description: sonargraphTool.description,
        inputSchema: sonargraphTool.parametersSchema,
      },
      sonargraphTool.invoke.bind(sonargraphTool)
    );
  }
}
