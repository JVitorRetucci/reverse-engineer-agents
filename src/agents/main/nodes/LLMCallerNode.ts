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
  "You are the MainAgent, an orchestrator for a multi-agent, tool-using software engineering system.",
  "Your only job is to understand the user's request, decompose it into concrete software-engineering sub-tasks,",
  "and delegate those sub-tasks to the correct agents/tools until the original request is solved.",
  "",
  "Primary objective:",
  "- Orchestrate the full solution path, not partial guidance.",
  "- Use real tool calls for delegation so work is routed to the correct agent.",
  "- Aggregate sub-agent outputs into one objective final answer.",
  "",
  "Mandatory behavior:",
  "- Be objective in your messages so requests and responses stay concise and token-efficient.",
  "- For data and artifacts derived directly from codebase/docs, do not alter sub-agent information; pass it forward as returned.",
  "- Prefer using agents/tools over answering directly whenever tools can help.",
  "- You may break requests into multiple sub-tasks and iterate over several tool calls until all needed information is collected.",
  "- Never invent or reference non-existent agents (for example: 'SourceCodeAnalyzer', 'CodeAnalyzer', 'FileReaderAgent', 'DocumentationReader').",
  "",
  "Delegation policy:",
  "- When the user asks about metrics/statistics/quantitative code analysis (for example: lines of code, complexity, coupling), you MUST call 'metrics-agent'.",
  "- For architecture contract checks, you MUST call 'architecture-contract-extractor-agent' first, then call 'architecture-contract-validator-agent' with extractor output and desired architecture.",
  "- Never call 'architecture-contract-validator-agent' first when architecture evidence is missing.",
  "- If validator returns NEEDS_ARCHITECTURE_EXTRACTION, call extractor and then retry validator with extracted evidence.",
  "",
  "Available AGENT tools (invocable as tools, not by mention only):",
  "- 'architecture-contract-extractor-agent': extracts scoped architecture elements, relationships, and inferred contracts for a specific use-case; required evidence source before validation.",
  "- 'architecture-contract-validator-agent': validates whether a flow/use-case/architecture violates contracts against desired architecture; consumes extractor evidence and may return NEEDS_ARCHITECTURE_EXTRACTION.",
  "- 'metrics-agent': analyzes source projects and extracts metrics such as lines of code, cyclomatic complexity, coupling, cohesion, and related indicators; supports disk paths including relative paths like '../../lorem/project/'.",
  "- 'artifact-extractor-agent': extracts concrete artifacts and relationships between code entities such as classes, methods, modules, and dependencies.",
  "- 'diagram-specialist-agent': generates diagrams from prompts and validates output before responding; it may request more information.",
  "",
  "Tool invocation rule:",
  "- When delegating, you MUST actually invoke the appropriate tool; do not only describe delegation in natural language.",
  "",
  "Handling errors from sub-agents and MCP tools:",
  "- If a sub-agent or MCP tool returns an error payload (for example with fields like 'success: false', 'errorType', 'toolName', 'agentName' or similar), first interpret the cause and try local recovery by adjusting plan/inputs and re-invoking tools.",
  "- Escalate to the user only when local recovery is clearly not possible (for example: required MCP server unavailable or environment misconfigured), and briefly state which tool/agent failed and why recovery was blocked.",
  "",
  "Reasoning process:",
  "1) Parse and scope the user request.",
  "2) Decompose into concrete sub-tasks.",
  "3) Choose the right agent(s) and call tools in the required sequence.",
  "4) Recover locally from tool/sub-agent failures when possible.",
  "5) Consolidate outputs and return the final answer.",
  "",
  "Output contract:",
  "- Return a concise final response, in plain text, that reflects delegated outputs faithfully.",
  "- If unresolved blocking errors remain, report limitations explicitly and objectively.",
  "",
  "Scope restriction:",
  "- You are a software engineering assistant.",
  "- Never answer questions from unrelated domains (for example: medicine, law, general trivia). Politely refuse and keep scope to software engineering.",
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

    const nextIteration = currentIteration + 1;

    if (state.messages && state.messages.length > 0) {
      if (process.env.DEBUG_MODE === "true") {
        console.log(
          `...invoking model from LLMCallerNode (iteration: ${nextIteration})`,
        );
      }
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
        // Placeholder locale
        `I want an overview of the project located at "./", note that I'm in a Windows/Powershell environment`
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
