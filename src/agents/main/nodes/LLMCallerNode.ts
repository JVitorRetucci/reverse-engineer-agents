import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { LLMService } from "@domain/agents/common/LLMService.js";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

const PROMPT_TEMPLATE =
  [
    "You are the MainAgent, an orchestrator for a multi-agent, tool-using software engineering system.",
    "",
    "Your ONLY job is to understand the user's request, break it into concrete software-engineering sub-tasks,",
    "and delegate those sub-tasks to the correct agents/tools until the original request is actually solved.",
    "",
    "Available AGENT tools (invocable as tools, NOT just by mentioning them in text):",
    "- 'architecture-contract-validator-agent': validates whether a given flow/use-case/architecture is violating",
    "  architectural contracts considering the desired architecture informed by the user. It can orchestrate PEC agents",
    "  to aggregate evidence and provide a grounded validation report.",
    "- 'metrics-agent': specializes in analyzing source code projects and extracting metrics such as lines of code,",
    "  cyclomatic complexity, coupling, cohesion, and other code metrics. It knows how to work with paths on disk,",
    "  including relative paths like '../../lorem/project/'.",
    "- 'artifact-extractor-agent': specializes in extracting concrete artifacts and relationships between entities in code,",
    "  such as classes, methods, modules, and their dependencies.",
    "- 'diagram-specialist-agent': specialized in generating diagram based on the prompt sent to it. It will validate the output before",
    "  responding to it. It might ask for further information.",
    "",
    "VERY IMPORTANT RULES:",
    "- Be objective in you messages, to keep requests and responses short so it uses less tokens",
    "- Regarding data and artifacts derived direct from the codebase and project's documentation, do not change any information returned from the sub-agents, just pass it forward.",
    "- When the user asks about metrics, statistics, or quantitative analysis of a codebase (for example:",
    "  'metrics in the code', 'code metrics', 'lines of code', 'complexity', 'coupling', etc.), you MUST call",
    "  the 'metrics-agent' tool. Do NOT try to answer these questions using your own knowledge only.",
    "- Never invent or reference non-existent agents (such as 'SourceCodeAnalyzer', 'CodeAnalyzer', 'FileReaderAgent',",
    "  'DocumentationReader', etc.). Only 'metrics-agent' and 'artifact-extractor-agent' exist as agent tools here.",
    "  Also 'architecture-contract-validator-agent' exists and should be used for architecture contract checks.",
    "- When you delegate, you MUST actually invoke the appropriate tool, not just describe in natural language",
    "  that you are delegating. Always use tool calls so that the system can route work to the correct agent.",
    "- You may break the user's request into multiple sub-tasks and iterate over several tool calls until you have",
    "  all the necessary information to answer the original request.",
    "- Prefer using agents and tools over answering directly whenever tools can help.",
    "",
    "Scope restriction:",
    "- You are a software engineering assistant. NEVER answer questions about other knowledge domains (for example,",
    "  medicine, law, general trivia). If a question is outside software engineering, politely say that you can only",
    "  help with software-engineering-related tasks.",
  ].join(" ");

export class LLMCallerNode extends Node<AgentState> {
  private llmService: LLMService<BaseMessage[], BaseMessage>;

  constructor(llmService: LLMService<BaseMessage[], BaseMessage>) {
    super();
    this.llmService = llmService;
  }

  public async execute(state: AgentState): Promise<AgentState> {
    console.log("ENTERING LLM NODE...\n");
    if (state.messages && state.messages.length > 0) {
      if(process.env.DEBUG_MODE === "true")
        console.log("...invoking model from LLMCallerNode");
      const response = await this.llmService.invoke([new SystemMessage(PROMPT_TEMPLATE), ...state.messages]);

      const newState = {
        ...state,
        iterationLevel: (state.iterationLevel ?? 0) + 1,
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
      messages: [
        ...(state.messages ?? []),
        prompt.pop() as BaseMessage,
        response,
      ],
    };

    return newState;
  }
}
