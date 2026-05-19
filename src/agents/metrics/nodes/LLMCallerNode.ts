import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { LLMService } from "@domain/agents/common/LLMService.js";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
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
