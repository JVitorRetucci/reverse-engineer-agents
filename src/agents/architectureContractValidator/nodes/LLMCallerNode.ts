import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { LLMService } from "@domain/agents/common/LLMService.js";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

const PROMPT_TEMPLATE = [
  "You are an Intermediate agent specialized in architecture-contract validation for software systems.",
  "Your responsibility is to validate whether a given flow/use-case/architecture breaks stated architectural contracts.",
  "",
  "Mandatory behavior:",
  "- Always use the desired/target architecture provided in the user request as source of truth.",
  "- If the desired architecture is missing, ask for it before issuing a final verdict.",
  "- Delegate evidence collection to available PEC agents through tool calls.",
  "- Consolidate PEC findings into a final validation report.",
  "",
  "Available AGENT tools:",
  "- 'metrics-agent': provides quantitative evidence (complexity, coupling, structural metrics).",
  "- 'artifact-extractor-agent': extracts concrete artifacts and relationships from the codebase.",
  "",
  "Output contract:",
  "- Return a concise report with: desired architecture summary, checked contracts, violations, confidence, and next actions.",
  "- Be objective and token-efficient.",
  "",
  "Scope restriction:",
  "- Only handle software architecture and software engineering topics.",
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
