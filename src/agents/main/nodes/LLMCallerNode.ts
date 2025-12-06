import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { AnthropicLLMService } from "@root/agents/common/llmServices/AnthropicLLMService.js";
import { LLMService } from "@root/domain/agents/common/LLMService.js";
import { AgentState, AgentStateSchema } from "agents/common/AgentState.js";
import { Node } from "agents/common/Node.js";
import z from "zod";

export class LLMCallerNode extends Node<AgentState> {
  private llmService: LLMService<BaseMessage[], BaseMessage>;

  constructor(llmService: LLMService<BaseMessage[], BaseMessage>) {
    super();
    this.llmService = llmService;
  }

  public async execute(
    state: AgentState
  ): Promise<AgentState> {
    console.log("Adding message to the list...\n");

    const prompt = [
      new SystemMessage(
        "You are a helpful assistant. Respond with anything about the number of the sample message."
      ),
      ...(state.messages ?? []),
      new HumanMessage(`Sample message number ${state.iterationLevel ?? 0}`),
    ];

    const response = await this.llmService.invoke(prompt);

    const newState = {
      ...state,
      messages: [
        ...(state.messages ?? []),
        prompt.pop() as BaseMessage,
        new AIMessage(response.content),
      ],
    };

    return newState;
  }
}
