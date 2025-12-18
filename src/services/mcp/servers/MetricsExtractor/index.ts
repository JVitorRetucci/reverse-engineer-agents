import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { mcpServerConfig, MetricsExtractorServer } from "./MetricsExtractor.js";
import {
  MetricsToolFactory,
  SCCMetricsToolFactory,
} from "../../toolFactories/MetricsToolFactory.js";

const server = new McpServer(
  {
    ...mcpServerConfig.serverInfo,
  },
  {
    ...mcpServerConfig.options,
  }
);

const serverr = new MetricsExtractorServer({
  metricsToolFactory: new SCCMetricsToolFactory(),
});

const transport = new StdioServerTransport();

serverr
  .connect(transport)
  .then(() => {
    console.error("Metrics Extractor MCP Server started successfully!");
  })
  .catch((error) => {
    console.error(`Fatal error during server initialization: ${error.message}`);
    process.exit(1);
  });
