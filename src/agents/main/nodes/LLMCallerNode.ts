import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { LLMService } from "@root/domain/agents/common/LLMService.js";
import { AgentState } from "@root/agents/common/states/AgentState.js";
import { Node } from "@root/agents/common/nodes/Node.js";

export class LLMCallerNode extends Node<AgentState> {
  private llmService: LLMService<BaseMessage[], BaseMessage>;

  constructor(llmService: LLMService<BaseMessage[], BaseMessage>) {
    super();
    this.llmService = llmService;
  }

  public async execute(state: AgentState): Promise<AgentState> {
    if (state.messages && state.messages.length > 0) {
      console.log("LLM CALLER NODE -- DENTRO DO IF")
      const response = await this.llmService.invoke(state.messages);
      
      const newState = {
        ...state,
        messages: [...state.messages, response],
      };
      
      return newState;
    }
    console.log("LLM CALLER NODE -- FORA DO IF")
    
    const prompt = [
      new SystemMessage("You are a helpful assistant."),
      ...(state.messages ?? []),
      new HumanMessage(
        `What is the forecast for orlando?\n- Latitude: 28.5383\n- Longitude: -81.3792`
      ),
    ];

    const response = await this.llmService.invoke(prompt);

    const newState = {
      ...state,
      messages: [
        ...(state.messages ?? []),
        prompt.pop() as BaseMessage,
        response,
      ],
    };

    return newState;
  }
}
