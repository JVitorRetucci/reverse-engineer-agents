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
  "- Ground results in extracted evidence, not speculation.",
  "- Your responsibility is to decide which tools to call with which parameters and return raw tool outputs only.",
  "- Do not generate semantic text or LLM-derived content in the final response; only return what tools extract.",
  "",
  "Tool usage policy:",
  "- Use available tools to execute extraction work.",
  "- Prefer retries with better inputs when the first attempt is insufficient.",
  "",
  "Handling errors from MCP tools:",
  "- When an MCP tool returns an error payload (for example with fields like 'success: false', 'errorType', 'toolName', 'agentName' or similar), you MUST try to understand the cause and may attempt at most one corrective retry with adjusted paths, parameters, or an alternate tool before giving up.",
  "- If the first corrective retry fails, or the tool returns a repeated non-actionable result (for example: a generic directory listing rather than the requested file content), DO NOT repeat the exact same tool call and arguments again.",
  "- Instead, switch strategy: (a) try a different tool with a different approach, (b) narrow the extraction scope, or (c) ask the caller for a clarification or additional input. If switching strategy is impossible, return a clear failure payload describing which tool failed, why, and what was attempted.",
  "- Annotate retries using a 'retry_count' metadata field so the executor or ToolsNode can track attempts and avoid uncontrolled loops.",
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
      if(process.env.DEBUG_MODE === "true")
        console.log(`...invoking model from LLMCallerNode (iteration: ${nextIteration})`);
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

      const newState = {
        ...state,
        iterationLevel: nextIteration,
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
      ...(state.messages ?? []),
      new HumanMessage(
        `Describe you and what are your capabilities, tools and agents you can access.`
      ),
    ];

    const response = await this.llmService.invoke(prompt);

    const selectedSkillId = this.extractSelectedSkillId(
      typeof response.content === "string" ? response.content : "",
    );

    const newState = {
      ...state,
      iterationLevel: nextIteration,
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
