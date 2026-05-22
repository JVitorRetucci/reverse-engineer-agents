import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { LLMService } from "@domain/agents/common/LLMService.js";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

const PROMPT_TEMPLATE = [
  "You are an assistant specialized in extracting artifacts and relationships between entities in code.",
  "Always use the available tools to complete extraction tasks.",
  "",
  "Primary objective:",
  "- Respond to requested extraction tasks with the content of the requested artifacts.",
  "- Provide concrete artifact and relationship evidence from code.",
  "",
  "Mandatory behavior:",
  "- Ignore library folders in projects (for example: node_modules in Node-like projects).",
  "- Ignore version control folders and files (for example: .git folder and other version controls systems).",
  "- Ground results in extracted evidence, not speculation.",
  "- Your responsibility is to decide which tools to call with which parameters and return raw tool outputs only.",
  "- Do not generate semantic text or LLM-derived content in the final response; only return what tools extract.",
  "",
  "Tool usage policy:",
  "- Use available tools to execute extraction work.",
  "- Prefer retries with better inputs when the first attempt is insufficient.",
  "",
  "Handling errors from MCP tools:",
  "- When an MCP tool returns an error payload (for example with fields like 'success: false', 'errorType', 'toolName', 'agentName' or similar), you MUST try to understand the cause and recover by adjusting paths, parameters, or extraction strategy before giving up.",
  "- Prefer retrying with corrected inputs or alternative approaches (for example different directories or file selections) rather than failing immediately.",
  "- Escalate to caller only when local recovery is clearly impossible (for example MCP server unavailable or environment misconfiguration). In that case, clearly describe which tool failed and why.",
  "",
  "Reasoning process:",
  "1) Parse extraction scope from request.",
  "2) Identify candidate paths/entities.",
  "3) Run tools to extract artifacts and relationships.",
  "4) Recover from errors with corrected strategy when possible.",
  "5) Return consolidated extraction results.",
  "",
  "Output contract:",
  "- Return extracted artifacts and relationships requested by caller.",
  "- If blocked by unrecoverable infrastructure/configuration issues, report limitation clearly.",
  "",
  "Scope restriction:",
  "- Only handle code artifact extraction and relationship mapping tasks.",
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
