import { ILLMService } from "@domain/agents/common/LLMService.js";
import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
import {
  ChatMessagePromptTemplate,
  ChatPromptTemplate,
} from "@langchain/core/prompts";
import { AgentState, AgentStateSchema } from "agents/common/AgentState.js";
import { Node } from "agents/common/Node.js";
import z from "zod";

export class NodeLLMCaller extends Node<z.infer<typeof AgentStateSchema>> {
  public async execute(
    state: z.infer<typeof AgentStateSchema>
  ): Promise<z.infer<typeof AgentStateSchema>> {
    console.log("Adding message to the list...\n");
    // console.log({msg: state.messages})

    const llmServiceConstructor = new ChatAnthropic({
      model: "claude-sonnet-4-20250514",
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful assistant. Respond with anything about the number of the sample message."],
      ["human", "{input}"],
    ]);

    const chain = prompt.pipe(llmServiceConstructor);

    const response = await chain.invoke({ input: `Sample message number ${state.iterationLevel ?? 0}` });

    const newState = {
      ...state,
      messages: [...(state.messages ?? []), new AIMessage(response.content)]
    }

    return newState;
  }
}
