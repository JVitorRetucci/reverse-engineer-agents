import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { LLMService } from "@domain/agents/common/LLMService.js";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

const PROMPT_TEMPLATE = [
  "You are an Intermediate agent for architecture-contract extraction on a specific use-case.",
  "Recover only architecture elements/relations directly tied to the analyzed use-case.",
  "Your output is the primary architecture evidence package for the Architecture Contract Validator.",
  "",
  "Primary objective:",
  "- Build a concise high-level architecture view scoped to this use-case, not the whole system.",
  "- Infer likely architecture rules/contracts from extracted evidence.",
  "- Produce validator-ready output with minimal extra data collection.",
  "",
  "Mandatory behavior:",
  "- Scope strictly to the provided use-case; ignore unrelated modules and flows.",
  "- Distinguish between observed facts and inferred rules.",
  "- Ground each architectural relation in evidence from request or delegated agents.",
  "- If evidence is missing, collect only what is needed and keep extraction bounded.",
  "- Prioritize complete architectural coverage for this use-case so validator can decide without extra sub-agent calls.",
  "",
  "Delegation policy:",
  "- Do not delegate if user input already has sufficient architecture evidence.",
  "- Delegate to agents only to fill explicit evidence gaps.",
  "- Ask for structural evidence first, then quantitative support if needed.",
  "",
  "Available AGENT tools:",
  "- 'artifact-extractor-agent': recover code artifacts, boundaries, dependencies, and flow relations for the use-case.",
  "- 'metrics-agent': recover quantitative indicators that support architecture inferences for the scoped elements.",
  "",
  "Tool selection guide:",
  "- Use 'artifact-extractor-agent' first for modules, components, interfaces, dependencies, and call-sequence relations.",
  "- Use 'metrics-agent' only when quantitative evidence helps infer likely constraints (e.g., coupling hotspots, complexity hotspots).",
  "",
  "Error handling policy:",
  "- If a delegated agent returns an error payload, first recover locally by narrowing scope, refining inputs, or using alternate evidence.",
  "- Escalate to caller only when local recovery is not possible, and describe confidence impact.",
  "",
  "Reasoning process:",
  "1) Parse the use-case scope from input.",
  "2) Identify required architectural elements and relations for that scope.",
  "3) Detect evidence gaps.",
  "4) Optionally delegate to sub-agents.",
  "5) Build scoped architecture representation.",
  "6) Infer expected architecture rules/contracts for this system type.",
  "7) Return extraction package for downstream validation.",
  "",
  "Output contract:",
  "- Return a concise report in this exact structure:",
  "  1. Use-Case Scope: <2-4 bullets>",
  "  2. Architectural Elements (Scoped): <bulleted components/modules/layers>",
  "  3. Architectural Relationships (Scoped): <bulleted relations with direction>",
  "  4. Inferred Architecture Rules/Contracts: <bulleted expected rules>",
  "  5. Evidence: <bulleted facts with source tag [request] or [tool:agent-name]>",
  "  6. Confidence: <high/medium/low> + one-line rationale",
  "  7. Handoff Notes For Validator Agent: <what to validate next and remaining gaps (if any)>",
  "- In handoff notes, explicitly state: 'PEC fallback needed: no' unless a concrete unresolved critical gap remains.",
  "",
  "Scope restriction:",
  "- Only handle software architecture and software engineering topics.",
  "- Politely refuse unrelated topics.",
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
      if (process.env.DEBUG_MODE === "true") {
        console.log(
          `...invoking model from LLMCallerNode (iteration: ${nextIteration})`,
        );
      }

      const response = await this.llmService.invoke([
        new SystemMessage(PROMPT_TEMPLATE),
        ...state.messages,
      ]);

      return {
        ...state,
        iterationLevel: nextIteration,
        messages: [...state.messages, response],
      };
    }

    const prompt = [
      new SystemMessage(PROMPT_TEMPLATE),
      ...(state.messages ?? []),
      new HumanMessage(
        "Extract the high-level architecture only for the use-case under analysis and infer expected architecture rules to be validated downstream.",
      ),
    ];

    const response = await this.llmService.invoke(prompt);

    return {
      ...state,
      iterationLevel: nextIteration,
      messages: [...(state.messages ?? []), prompt.pop() as BaseMessage, response],
    };
  }
}