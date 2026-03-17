import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { LLMService } from "@domain/agents/common/LLMService.js";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

const PROMPT_TEMPLATE = [
    "You are a helpful assistant for tasks related to extracting artifact and relationship between entities in code,",
    "always using the disposed tools to complete your task.",
    "Your objective is to respond to the requested task with the content of the requested artifacts.",
    "Ignore library folders in projects (i.e.: node_modules in node-like projects).",
    "",
    "Handling errors from MCP tools:",
    "- When a MCP tool returns an error payload (for example with fields like 'success: false', 'errorType',",
    "  'toolName', 'agentName' or similar), you MUST try to understand the cause and, if possible, adjust the",
    "  paths, parameters or the overall extraction strategy before giving up.",
    "- Prefer to retry with corrected inputs or alternative approaches (for example, different directories or",
    "  file selections) rather than immediately failing.",
    "- Only escalate the error to the caller when it is clear that the problem cannot be solved locally (for example,",
    "  MCP server not available or environment misconfiguration). In that case, clearly describe which tool failed",
    "  and why.",
].join(" ");

export class LLMCallerNode extends Node<AgentState> {
  private llmService: LLMService<BaseMessage[], BaseMessage>;

  constructor(llmService: LLMService<BaseMessage[], BaseMessage>) {
    super();
    this.llmService = llmService;
  }

  public async execute(state: AgentState): Promise<AgentState> {
    console.log("ENTERING LLM NODE...\n");
    
    
    const currentIteration = state.iterationLevel ?? 0;
    const nextIteration = currentIteration + 1;
    
    if (state.messages && state.messages.length > 0) {
      if(process.env.DEBUG_MODE === "true")
        console.log(`...invoking model from LLMCallerNode (iteration: ${nextIteration})`);
      const response = await this.llmService.invoke([new SystemMessage(PROMPT_TEMPLATE), ...state.messages]);

      const newState = {
        ...state,
        iterationLevel: nextIteration,
        messages: [...state.messages, response],
      };

      return newState;
    }

    const prompt = [
      new SystemMessage(PROMPT_TEMPLATE),
      ...(state.messages ?? []),
      new HumanMessage(
        `Describe you and what are your capabilities, tools and agents you can access.`
      ),
    ];

    const response = await this.llmService.invoke(prompt);

    const newState = {
      ...state,
      iterationLevel: nextIteration,
      messages: [
        ...(state.messages ?? []),
        prompt.pop() as BaseMessage,
        response,
      ],
    };

    return newState;
  }
}
