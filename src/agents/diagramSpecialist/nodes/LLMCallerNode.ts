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
import { getRuntimeConfig } from "@core/RuntimeConfig.js";

const runtime = getRuntimeConfig();

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

const MAX_ITERATIONS = runtime.max_agent_iterations;

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
        note: "Please add this summary to the context of the calling agent.",
      });

      const summaryMsg = new ToolMessage({ tool_call_id: "iteration_error", content: summaryText });

      return { ...state, messages: [...(state.messages ?? []), summaryMsg] };
    }

    const toolErrorLimitMessage = buildToolErrorLimitMessage(state.messages);

    if (toolErrorLimitMessage) {
      return { ...state, messages: [...state.messages, toolErrorLimitMessage] };
    }

    if (state.messages && state.messages.length > 0) {
      if (runtime.debug_mode)
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
