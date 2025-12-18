import "dotenv/config";

import { MainAgent } from "./agents/main/agent.js";
import { LLMCallerNode } from "@root/agents/main/nodes/LLMCallerNode.js";
import { AnthropicLLMServiceFactory } from "@agents/common/llmServices/factories/AnthropicLLMServiceFactory.js";
import { MCPClientsAdapter } from "./agents/common/mcpClients/mcpAdapter.js";
import { GoogleLLMServiceFactory } from "./agents/common/llmServices/factories/GoogleLLMServiceFactory.js";
import { ToolsNode } from "./agents/main/nodes/ToolsNode.js";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

async function startMainAgent(): Promise<[MainAgent, MultiServerMCPClient]> {
  const mcpAdapter = MCPClientsAdapter.getMultipleClientsConnection({
    mcpServers: {
       "metrics-extractor": {
          command: "npm",
          args: ["run", "--prefix", process.env.METRICS_MCP_PATH ?? "", "mcp-server/metrics-extractor"],
        }
    }
  });

  const allTools = await mcpAdapter.getTools()

  const llmService = new AnthropicLLMServiceFactory().create({ tools: allTools });
  // const llmService = new GoogleLLMServiceFactory().create({ tools: allTools });
  
  const llmNode = new LLMCallerNode(llmService);
  const toolsNode = new ToolsNode({ tools: allTools })

  return [new MainAgent({ llmCallerNode: llmNode, toolsNode: toolsNode }), mcpAdapter];
}

async function main() {
  const [agent, mcpAdapter] = await startMainAgent();
  const r = await agent.getNewAgentInstance();
  const s = await r.invoke({});

  s.messages.forEach((msg) =>
    console.log(`\n======= [${msg.type}] =======
    \n${msg.content}`)
  );

  console.log("\n=== Ending conversation... ===\n")
  await mcpAdapter.close()
  return 1;
}

main().then(a => console.log(`Finished with ${a}`)).catch((err) => console.error(err));
