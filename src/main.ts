import "dotenv/config";

import { MainAgent } from "./agents/main/agent.js";
import { LLMCallerNode } from "@root/agents/main/nodes/LLMCallerNode.js";
import { AnthropicLLMServiceFactory } from "@agents/common/llmServices/factories/AnthropicLLMServiceFactory.js";

function startMainAgent(): MainAgent {
  const llmService = new AnthropicLLMServiceFactory().create();
  const llmNode = new LLMCallerNode(llmService);

  return new MainAgent({ llmCallerNode: llmNode });
}

async function main() {
  const a = startMainAgent();
  const r = await a.getNewAgentInstance();
  const s = await r.invoke({});

  s.messages.forEach((msg) =>
    console.log(`\n
  ======= [${msg.type}] =======\n
  ${msg.content}\n
  `)
  );
}

main().catch((err) => console.error(err));
