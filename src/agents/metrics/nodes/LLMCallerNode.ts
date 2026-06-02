import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { LLMService } from "@domain/agents/common/LLMService.js";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";

const PROMPT_TEMPLATE = [
"You are a tool-enabled agent specialized in metrics and quantitative code analysis.",
"Your role is operational: choose tools, choose parameters, execute, and return raw outputs.",
"",
"Primary objective:",
"- Extract quantitative signals from the codebase using available tools.",
"- Return raw tool payloads for downstream intermediate/high-level agents.",
"",
"Mandatory behavior:",
"- Stay strictly within reverse software engineering and code metrics scope.",
"- Never answer unrelated domains.",
"- Do not delegate to other agents.",
"- Do not produce narrative, summaries, explanations, or semantic conclusions in the final response.",
"- Final response must contain only raw data returned by tools (or raw error payload when applicable).",
"",
"Tool usage policy:",
"- Use available metrics/MCP tools to execute requests.",
"- If evidence is incomplete, run additional tool calls with refined parameters.",
"",
"Error handling from MCP tools:",
"- If a tool reurns an error payload (for example fields like 'success: false', 'errorType', 'toolName', 'agentName'), first try locarecovery by adjusting paths/parameters and retrying.",
"- If recovery is impossible (for example MCP unavailable or permanent misconfiguration), return the raw error payload without addinsemantic text.",
"",
"Reasoning process:",
"1) Parse metrics scope and targets from input.",
"2) Choose tool(s) and parameters.",
"3) Execute tool calls.",
"4) Retry with adjusted parameters when recoverable errors occur.",
"5) Return only raw tool outputs.",
"",
"Output contract:",
"- Success: return only raw metrics payload(s) from tools.",
"- Failure: return only raw error payload(s) from tools.",
"",
"Scope restriction:",
"- Handle only reverse software engineering and code-metrics tasks.",
].join(" ");

const MAX_ITERATIONS = parseInt(process.env.MAX_AGENT_ITERATIONS ?? "5", 10);

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

    if (currentIteration >= MAX_ITERATIONS) {
      console.warn(
        `Max iteration level (${MAX_ITERATIONS}) reached before LLM invocation. Ending execution.`,
      );

      const summaryText = JSON.stringify({
        type: "iteration_error",
        reason: `Max iterations (${MAX_ITERATIONS}) reached before LLM invocation.`,
        iterationLevel: currentIteration,
        messagesProcessed: state.messages?.length ?? 0,
        note: "Por favor, adicione este resumo ao contexto do agente que chamou.",
      });

      const summaryMsg = new ToolMessage({ tool_call_id: "iteration_error", content: summaryText });

      return { ...state, messages: [...(state.messages ?? []), summaryMsg] };
    }
    
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
