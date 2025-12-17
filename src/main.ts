import "dotenv/config";

import { MainAgent } from "./agents/main/agent.js";
import { LLMCallerNode } from "@root/agents/main/nodes/LLMCallerNode.js";
import { AnthropicLLMServiceFactory } from "@agents/common/llmServices/factories/AnthropicLLMServiceFactory.js";
import { MCPClientsAdapter } from "./agents/common/mcpClients/mcpAdapter.js";
import { GoogleLLMServiceFactory } from "./agents/common/llmServices/factories/GoogleLLMServiceFactory.js";

async function startMainAgent(): Promise<MainAgent> {
  const mcpAdapter = MCPClientsAdapter.getMultipleClientsConnection({
    mcpServers: {
       "weather": {
          command: "npm",
          args: ["run", "--prefix", "[path-to-server]", "start"],
        }
    }
  });

  const allTools = await mcpAdapter.getTools()

  // const llmService = new AnthropicLLMServiceFactory().create({ tools: allTools });
  const llmService = new GoogleLLMServiceFactory().create({ tools: allTools });
  const llmNode = new LLMCallerNode(llmService);

  return new MainAgent({ llmCallerNode: llmNode });
}

async function main() {
  const a = await startMainAgent();
  const r = await a.getNewAgentInstance();
  const s = await r.invoke({});

  s.messages.forEach((msg) =>
    console.log(`\n======= [${msg.type}] =======
    \n${msg.content}`)
  );

  console.log("\n=== Ending conversation... ===\n")
  return 1;
}

main().then(a => console.log(`Finished with ${a}`)).catch((err) => console.error(err));
