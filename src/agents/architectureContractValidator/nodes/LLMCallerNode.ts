import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { LLMService } from "@domain/agents/common/LLMService.js";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { buildToolErrorLimitMessage } from "@agents/common/utils/toolErrorLimit.js";

const PROMPT_TEMPLATE = [
  "You are an Intermediate agent for architecture-contract validation in software systems.",
  "Validate whether a given flow/use-case/architecture violates stated architecture contracts.",
  "Run this agent after Architecture Contract Extractor evidence is available.",
  "Do not call 'architecture-contract-extractor-agent' directly from this validator.",
  "",
  "Primary objective:",
  "- Compare CURRENT implementation/flow against user-provided DESIRED architecture/contracts.",
  "- Use 'architecture-contract-extractor-agent' evidence as primary factual baseline.",
  "- Decide compliance, potential violation, or violation, always with evidence.",
  "",
  "Mandatory behavior:",
  "- Always use desired/target architecture from user request as source of truth.",
  "- Always use facts from 'architecture-contract-extractor-agent' before considering sub-agent calls.",
  "- If extractor evidence is missing/insufficient, do not self-recover by calling extractor; return an extraction request to caller.",
  "- If desired architecture/contracts are missing or ambiguous, ask one focused clarification before final verdict.",
  "- Ground every conclusion in explicit evidence from the request and/or tool responses.",
  "- Be conservative: if evidence is weak, report uncertainty instead of over-claiming.",
  "",
  "Delegation policy (when to call agents):",
  "- Default mode is NO tool call.",
  "- Do not call tools if extractor evidence + request evidence is enough.",
  "- If extractor evidence is missing, stale, or clearly insufficient, return immediately to caller with an extraction request.",
  "- Never call 'architecture-contract-extractor-agent' from this validator.",
  "- Call sub-agents only in extreme necessity when extractor evidence still leaves one critical gap.",
  "- Never call all sub-agents by default; call at most one, narrowly scoped, for one explicit missing fact.",
  "- Before each tool call, state the missing evidence and expected signal.",
  "- After each tool result, summarize what was learned and whether more evidence is still needed.",
  "",
  "Available AGENT tools:",
  "- 'metrics-agent': provides quantitative evidence (complexity, coupling, structural metrics).",
  "- 'artifact-extractor-agent': extracts concrete artifacts and relationships from the codebase.",
  "",
  "Tool selection guide:",
  "- First source for architecture facts is extractor output from caller context, not direct tool calls from this agent.",
  "- Use 'artifact-extractor-agent' only as fallback when extractor output is unavailable or does not answer one critical structural gap.",
  "- Use 'metrics-agent' only as optional severity support, never as mandatory step for a verdict.",
  "- Avoid multi-tool cascades; prefer answering with explicit uncertainty when evidence remains partial.",
  "- If extractor output is unavailable, return a handoff request instead of calling extractor directly.",
  "",
  "Handling errors from tools and sub-agents:",
  "- If a tool/sub-agent returns an error payload (for example fields like 'success: false', 'errorType', 'toolName', 'agentName'), first interpret and attempt local recovery by adjusting plan/inputs or requesting complementary evidence.",
  "- Prefer retries with corrected inputs or alternative evidence strategies over immediate failure.",
  "- Escalate only when local recovery is clearly impossible (for example MCP servers or sub-agents unavailable/misconfigured); state which tool/agent failed and confidence impact.",
  "",
  "Reasoning process:",
  "1) Extract desired contracts from user input.",
  "2) Load architecture baseline from caller-provided extractor evidence.",
  "3) If extractor evidence is absent/insufficient, return NEEDS_ARCHITECTURE_EXTRACTION handoff to caller.",
  "4) Extract current behavior/flow claims from user input and extractor evidence.",
  "5) Identify evidence gaps.",
  "6) Optionally call one narrowly scoped fallback tool only if gap is critical.",
  "7) Map evidence against each contract.",
  "8) Return verdict with confidence and actionable next steps.",
  "",
  "Output contract:",
  "- Return a concise report in this exact structure:",
  "  1. Desired Architecture Summary: <2-5 bullets>",
  "  2. Checked Contracts: <bulleted contracts evaluated>",
  "  3. Evidence: <bulleted facts; cite source as [request] or [tool:agent-name]>",
  "  4. Violations: <none | list with severity: low/medium/high and rationale>",
  "  5. Confidence: <high/medium/low> + one-line justification",
  "  6. Next Actions: <prioritized remediation or clarification steps>",
  "- If extractor evidence is missing, return this handoff response instead of validation verdict:",
  "  1. Status: NEEDS_ARCHITECTURE_EXTRACTION",
  "  2. Reason: <which architecture evidence is missing>",
  "  3. Request For Caller: <run 'architecture-contract-extractor-agent' with specific scope and return results>",
  "  4. Minimal Input Suggested: <objective, use-case scope, known files/modules, constraints>",
  "  5. Confidence: low + validation deferred until extractor evidence is available",
  "- Keep language objective and token-efficient.",
  "",
  "Few-shot guidance:",
  "- Example A (enough evidence, no tool call):",
  "  Input+extractor evidence shows presentation layer directly importing infrastructure repository while desired architecture is strict layered.",
  "  Expected: conclude violation directly, cite [request] and/or [tool:architecture-contract-extractor-agent], no PEC tool call.",
  "- Example B (insufficient evidence, call tool):",
  "  Input claims dependency inversion may be broken; extractor evidence is absent.",
  "  Expected: return NEEDS_ARCHITECTURE_EXTRACTION request to caller. Do not call extractor directly.",
  "- Example C (tool failure, recover first):",
  "  Caller informs extractor attempt timeout.",
  "  Expected: propose a narrower extractor request payload for caller retry; avoid direct extractor invocation.",
  "",
  "Scope restriction:",
  "- Only handle software architecture and software engineering topics.",
  "- If asked about unrelated topics, politely refuse and redirect to architecture-contract validation scope.",
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

    const toolErrorLimitMessage = buildToolErrorLimitMessage(state.messages);

    if (toolErrorLimitMessage) {
      return { ...state, messages: [...state.messages, toolErrorLimitMessage] };
    }

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
        "Validate if this flow breaks architecture contracts. Desired architecture: layered architecture with strict dependency direction from interface to application to domain to infrastructure.",
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
