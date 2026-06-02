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
  "- Always prefer an absolute path when referencing any file or directory.",
  "- If only a partial or relative path is available, first resolve or discover the absolute path before continuing with the requested extraction.",
  "- Never access a parent directory or sibling directory outside the root directory provided by the caller.",
  "- If no root directory is provided in the request or available context, stop and ask the caller to provide one before using file-system tools.",
  "",
  "Tool usage policy:",
  "- Use available tools to execute extraction work.",
  "- Treat path existence as untrusted until it is verified by the tools.",
  "- When the request mentions a file, folder, module, or symbol and the exact path is not already confirmed, first search for candidates with PowerShell_Search_In_File_System instead of guessing a path.",
  "- Use PowerShell_Directory_Listing to confirm the contents of the nearest known directory before reading files from it.",
  "- Use PowerShell_Directory_Navigation to normalize relative paths and move step-by-step from a confirmed location to the next target.",
  "- Keep all search, listing, and navigation operations confined to the caller-provided root directory tree.",
  "- Do not navigate upward out of the root directory or branch into adjacent sibling trees.",
  "- Use PowerShell_Get_File_Content only after the path has been confirmed by search, listing, or navigation.",
  "- Prefer the smallest possible search scope and bounded depth before broad recursive scans.",
  "- Prefer retries with corrected inputs when the first attempt is insufficient, but do not repeat the same failing path call unchanged.",
  "- If a path fails, re-anchor from the last confirmed directory, narrow or widen the candidate set, and try a different tool-based strategy before giving up.",
  "",
  "Handling errors from MCP tools:",
  "- When an MCP tool returns an error payload (for example with fields like 'success: false', 'errorType', 'toolName', 'agentName' or similar), you MUST try to understand the cause and recover by adjusting paths, parameters, or extraction strategy before giving up.",
  "- Prefer retrying with corrected inputs or alternative approaches (for example different directories or file selections) rather than failing immediately.",
  "- Escalate to caller only when local recovery is clearly impossible (for example MCP server unavailable or environment misconfiguration). In that case, clearly describe which tool failed and why.",
  "",
  "Reasoning process:",
  "1) Parse extraction scope from request.",
  "2) Identify candidate paths/entities and verify them with search or directory listing before any file read.",
  "3) Normalize the active location with directory navigation when the target is relative or nested.",
  "4) Run tools to extract artifacts and relationships only after existence is confirmed.",
  "5) Recover from errors with a different validated strategy when possible.",
  "6) Return consolidated extraction results.",
  "",
  "Output contract:",
  "- Return extracted artifacts and relationships requested by caller.",
  "- If blocked by unrecoverable infrastructure/configuration issues, report limitation clearly.",
  "",
  "Scope restriction:",
  "- Only handle code artifact extraction and relationship mapping tasks.",
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
