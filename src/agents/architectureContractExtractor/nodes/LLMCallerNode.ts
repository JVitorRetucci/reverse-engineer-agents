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
  "Skills context is provided in a separate section.",
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
  private skillsPrompt: string;

  constructor(llmService: LLMService<BaseMessage[], BaseMessage>, skillsPrompt = "") {
    super();
    this.llmService = llmService;
    this.skillsPrompt = skillsPrompt;
  }

  private buildSystemPrompt(state: AgentState): string {
    const parts = [PROMPT_TEMPLATE, state.skillsPrompt ?? this.skillsPrompt].filter(Boolean);
    if (state.blockedTools && state.blockedTools.length > 0) {
      const blocked = state.blockedTools.map((b) => `- ${b.toolName} args=${b.args}`).join('\n');
      parts.push(`Blocked tool calls (do NOT retry):\n${blocked}`);
    }
    return parts.join("\n\n");
  }

  private logPromptPreview(prompt: string): void {
    const head = prompt.slice(0, 100);
    const tail = prompt.slice(-100);
    console.log(`[100 primeiros]\n${head}\n...\n[100 ultimos]\n${tail}`);
  }

  private extractSelectedSkillId(content: string): string | undefined {
    const match = content.match(/SKILL_ID:\s*([A-Za-z0-9_-]+)/i);
    return match?.[1];
  }

  private extractReasoning(content: string): string | null {
    if (!content) return null;
    const lines = String(content).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const cues = lines.filter((l) => /^(Reason|Thought|Plan|Steps?)[:\-]/i.test(l) || /\bbecause\b/i.test(l));
    if (cues.length > 0) return cues.join(' ');
    return content.replace(/\s+/g, ' ').slice(0, 300);
  }

  public async execute(state: AgentState): Promise<AgentState> {
    console.log("ENTERING LLM NODE...\n");

    const systemPrompt = this.buildSystemPrompt(state);
    this.logPromptPreview(systemPrompt);

    const currentIteration = state.iterationLevel ?? 0;
    const nextIteration = currentIteration + 1;

    if (state.messages && state.messages.length > 0) {
      if (process.env.DEBUG_MODE === "true") {
        console.log(
          `...invoking model from LLMCallerNode (iteration: ${nextIteration})`,
        );
      }

      const response = await this.llmService.invoke([
        new SystemMessage(systemPrompt),
        ...state.messages,
      ]);

      const respContent = typeof response.content === 'string' ? response.content : '';
      const selectedSkillId = this.extractSelectedSkillId(respContent);
      console.log('[llm] model response preview:\n' + (respContent.length > 1000 ? respContent.slice(0,1000) + '...' : respContent));
      const reasoning = this.extractReasoning(respContent);
      if (reasoning) console.log('[llm] extracted reasoning: ' + reasoning);
      if (selectedSkillId) console.log('[llm] decision: select skill ' + selectedSkillId);

      return {
        ...state,
        iterationLevel: nextIteration,
        messages: [...state.messages, response],
        selectedSkillId: selectedSkillId ?? state.selectedSkillId,
        skillBodyLoaded:
          selectedSkillId && selectedSkillId !== state.selectedSkillId
            ? false
            : state.skillBodyLoaded,
      };
    }

    const prompt = [
      new SystemMessage(systemPrompt),
      ...(state.messages ?? []),
      new HumanMessage(
        "Extract the high-level architecture only for the use-case under analysis and infer expected architecture rules to be validated downstream.",
      ),
    ];

    const response = await this.llmService.invoke(prompt);

    const selectedSkillId = this.extractSelectedSkillId(
      typeof response.content === "string" ? response.content : "",
    );

    return {
      ...state,
      iterationLevel: nextIteration,
      messages: [...(state.messages ?? []), prompt.pop() as BaseMessage, response],
      selectedSkillId: selectedSkillId ?? state.selectedSkillId,
      skillBodyLoaded:
        selectedSkillId && selectedSkillId !== state.selectedSkillId
          ? false
          : state.skillBodyLoaded,
    };
  }
}