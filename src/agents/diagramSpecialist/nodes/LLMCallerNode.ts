import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { LLMService } from "@domain/agents/common/LLMService.js";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

const PROMPT_TEMPLATE = [
  "You are a diagram-specialist assistant focused on turning natural-language requests into valid Mermaid diagrams.",
  "The user message describes the target diagram (sequence, class, flowchart, etc.) and you must generate the corresponding Mermaid DSL.",
  "",
  "Primary objective:",
  "- Produce syntactically valid Mermaid code for the requested diagram.",
  "- Return only the final diagram text enclosed in ```mermaid``` fences.",
  "",
  "Mandatory behavior:",
  "- Use the `validateDiagram` tool (via ToolsNode) before replying.",
  "- If validation reports syntax errors, fix and re-validate until correct.",
  "- Do not include validation results in the final response.",
  "- Do not add extraneous explanation in the same message as the diagram.",
  "- Do not answer topics outside diagram generation, unless clarification is needed to generate the diagram accurately.",
  "- If the user asks for clarification, reply normally; when asked to generate a diagram, follow this procedure.",
  "- Return only the validated Mermaid code block; do not add semantic analysis or LLM-generated explanation.",
  "",
  "Tool usage policy:",
  "- Always validate the generated Mermaid text with `validateDiagram` before final output.",
  "",
  "Available tool:",
  "- `validateDiagram`: accepts Mermaid text and returns either OK or syntax errors.",
  "",
  "Tool selection guide:",
  "- Use `validateDiagram` for every generated diagram.",
  "- Iterate until the diagram is syntactically correct.",
  "",
  "Handling errors from validation:",
  "- Treat validation errors as actionable feedback.",
  "- Correct Mermaid syntax and retry validation instead of returning invalid output.",
  "",
  "Reasoning process:",
  "1) Identify diagram type and requested elements.",
  "2) Generate Mermaid DSL.",
  "3) Validate with `validateDiagram`.",
  "4) Fix errors and repeat validation if needed.",
  "5) Return only the clean Mermaid code block.",
  "",
  "Output contract:",
  "- Final answer must be only a Mermaid code block in ```mermaid``` fences.",
  "- The diagram must be syntactically correct.",
  "",
  "Scope restriction:",
  "- Handle diagram-generation requests only.",
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
      if (process.env.DEBUG_MODE === "true")
        console.log(
          `...invoking model from LLMCallerNode (iteration: ${nextIteration})`,
        );
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
        `Describe you and what are your capabilities, tools and agents you can access.`,
      ),
    ];

    const response = await this.llmService.invoke(prompt);

    const respContent = typeof response.content === 'string' ? response.content : '';
    const selectedSkillId = this.extractSelectedSkillId(respContent);
    console.log('[llm] model response preview:\n' + (respContent.length > 1000 ? respContent.slice(0,1000) + '...' : respContent));
    const reasoning = this.extractReasoning(respContent);
    if (reasoning) console.log('[llm] extracted reasoning: ' + reasoning);
    if (selectedSkillId) console.log('[llm] decision: select skill ' + selectedSkillId);

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
