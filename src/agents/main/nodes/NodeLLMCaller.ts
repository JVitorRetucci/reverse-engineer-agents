import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { AnthropicLLMService } from "@root/agents/common/llmServices/AnthropicLLMService.js";
import { AgentStateSchema } from "agents/common/AgentState.js";
import { Node } from "agents/common/Node.js";
import z from "zod";

export class NodeLLMCaller extends Node<z.infer<typeof AgentStateSchema>> {
  public async execute(
    state: z.infer<typeof AgentStateSchema>
  ): Promise<z.infer<typeof AgentStateSchema>> {
    console.log("Adding message to the list...\n");
    // console.log({msg: state.messages})

    const llmServiceConstructor = new AnthropicLLMService();

    const prompt = [
      new SystemMessage(
        "You are a helpful assistant. Respond with anything about the number of the sample message."
      ),
      ...state.messages ?? [],
      new HumanMessage(`Sample message number ${state.iterationLevel ?? 0}`),
    ];

    const response = await llmServiceConstructor.invoke(prompt);

    const newState = {
      ...state,
      messages: [...(state.messages ?? []), prompt.pop() as BaseMessage, new AIMessage(response.content)],
    };

    console.table(newState.messages)

    return newState;
  }
}
