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
    console.log("ENTERING LLM NODE...\n")
    if (state.messages && state.messages.length > 0) {
      const response = await this.llmService.invoke(state.messages);
      
      const newState = {
        ...state,
        messages: [...state.messages, response],
      };
      
      return newState;
    }
    
    const prompt = [
      new SystemMessage("You are a helpful assistant."),
      ...(state.messages ?? []),
      new HumanMessage(
        // Placeholder locale
        `I want an overview of the project located at "./", note that I'm in a Windows/Powershell environment`
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
