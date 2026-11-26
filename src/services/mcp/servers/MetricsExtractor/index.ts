import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MetricsExtractorServer } from "./MetricsExtractor.js";
import { SCCMetricsToolFactory } from "@services/mcp/toolFactories/MetricsToolFactory.js";

const server = new MetricsExtractorServer({
  metricsToolFactory: new SCCMetricsToolFactory(),
});

const transport = new StdioServerTransport();

server
  .connect(transport)
  .then(() => {
    console.error("Metrics Extractor MCP Server started successfully!");
  })
  .catch((error) => {
    console.error(`Fatal error during server initialization: ${error.message}`);
    process.exit(1);
  });
