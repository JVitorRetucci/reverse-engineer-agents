import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { LLMService } from "@domain/agents/common/LLMService.js";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
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
  "Skills context is provided in a separate section.",
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
  "- Return a concise final response that reflects delegated outputs faithfully.",
  "- If unresolved blocking errors remain, report limitations explicitly and objectively.",
  "",
  "Scope restriction:",
  "- You are a software engineering assistant.",
  "- Never answer questions from unrelated domains (for example: medicine, law, general trivia). Politely refuse and keep scope to software engineering.",
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
    // Try to capture explicit reasoning cues
    const lines = String(content).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const cues = lines.filter((l) => /^(Reason|Thought|Plan|Steps?)[:\-]/i.test(l) || /\bbecause\b/i.test(l));
    if (cues.length > 0) return cues.join(" ");
    // fallback: return a short excerpt that likely contains reasoning
    const excerpt = content.replace(/\s+/g, ' ').slice(0, 300);
    return excerpt;
  }

  public async execute(state: AgentState): Promise<AgentState> {
    console.log("ENTERING LLM NODE...\n");
    const systemPrompt = this.buildSystemPrompt(state);
    this.logPromptPreview(systemPrompt);
    if (state.messages && state.messages.length > 0) {
      if(process.env.DEBUG_MODE === "true")
        console.log("...invoking model from LLMCallerNode");
      const response = await this.llmService.invoke([
        new SystemMessage(systemPrompt),
        ...state.messages,
      ]);

      const respContent = typeof response.content === "string" ? response.content : "";
      const selectedSkillId = this.extractSelectedSkillId(respContent);

      console.log('[llm] model response preview:\n' + (respContent.length > 1000 ? respContent.slice(0,1000)+'...' : respContent));
      const reasoning = this.extractReasoning(respContent);
      if (reasoning) console.log('[llm] extracted reasoning: ' + reasoning);
      if (selectedSkillId) console.log('[llm] decision: select skill ' + selectedSkillId);

      const newState = {
        ...state,
        iterationLevel: (state.iterationLevel ?? 0) + 1,
        messages: [...state.messages, response],
        selectedSkillId: selectedSkillId ?? state.selectedSkillId,
        skillBodyLoaded:
          selectedSkillId && selectedSkillId !== state.selectedSkillId
            ? false
            : state.skillBodyLoaded,
      };

      return newState;
    }

    const prompt = [
      new SystemMessage(systemPrompt),
      ...(state.messages ?? [])
    ];

    const response = await this.llmService.invoke(prompt);

    const respContent = typeof response.content === "string" ? response.content : "";
    const selectedSkillId = this.extractSelectedSkillId(respContent);
    console.log('[llm] model response preview:\n' + (respContent.length > 1000 ? respContent.slice(0,1000)+'...' : respContent));
    const reasoning = this.extractReasoning(respContent);
    if (reasoning) console.log('[llm] extracted reasoning: ' + reasoning);
    if (selectedSkillId) console.log('[llm] decision: select skill ' + selectedSkillId);

    const newState = {
      ...state,
      messages: [
        ...(state.messages ?? []),
        prompt.pop() as BaseMessage,
        response,
      ],
      selectedSkillId: selectedSkillId ?? state.selectedSkillId,
      skillBodyLoaded:
        selectedSkillId && selectedSkillId !== state.selectedSkillId
          ? false
          : state.skillBodyLoaded,
    };

    return newState;
  }
}
