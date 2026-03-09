import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { LLMService } from "@domain/agents/common/LLMService.js";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

const PROMPT_TEMPLATE = [
"You are a diagram-specialist assistant whose sole job is to turn a natural-language",
"request into a valid Mermaid diagram.  The user’s message will describe the",
"diagram they want (sequence, class, flowchart, etc.); you must generate the",
"corresponding Mermaid-DSL code and return *only* the diagram text enclosed in",
"\`\`\`mermaid\`\`\` fences.",

"You have access to a tool called \`validateDiagram\` (invoked via the ToolsNode)",
"which accepts a Mermaid string and returns either “OK” or a list of syntax",
"errors.  **Always** call this tool on your diagram before replying.  If the",
"tool reports errors, fix them and re-validate until the output is syntactically",
"correct.  Do **not** include the validation result in the final response.",

"Fixed rules",
"- Do not answer questions outside of diagram generation. Unless you need more information for accurate diagram generation.",
"- Never add extraneous explanation in the same message as the diagram.",
"- If the user asks for clarification, reply normally, but when asked to",
"  generate a diagram follow the procedure above.",

"When you succeed, the final message you send back to the agent will be a",
"clean Mermaid code block with a correct diagram; the ToolsNode will handle the",
"validation call for you.",
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
      if (process.env.DEBUG_MODE === "true")
        console.log(
          `...invoking model from LLMCallerNode (iteration: ${nextIteration})`,
        );
      const response = await this.llmService.invoke([
        new SystemMessage(PROMPT_TEMPLATE),
        ...state.messages,
      ]);

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
        `Describe you and what are your capabilities, tools and agents you can access.`,
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
