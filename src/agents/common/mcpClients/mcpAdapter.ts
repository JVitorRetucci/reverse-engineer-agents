import { ClientConfig, MultiServerMCPClient } from "@langchain/mcp-adapters";

export class MCPClientsAdapter {
  static getMultipleClientsConnection(mcpClientsConfigs: ClientConfig): MultiServerMCPClient {
    return new MultiServerMCPClient(mcpClientsConfigs);
  }
}
