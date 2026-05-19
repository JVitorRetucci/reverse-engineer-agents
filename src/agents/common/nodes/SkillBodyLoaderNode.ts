import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { SkillRegistry } from "@agents/common/skills/SkillRegistry.js";

export class SkillBodyLoaderNode extends Node<AgentState> {
  private registry: SkillRegistry;

  constructor(registry: SkillRegistry) {
    super();
    this.registry = registry;
  }

  public async execute(state: AgentState): Promise<AgentState> {
    if (!state.selectedSkillId) {
      return state;
    }

    console.log(`[skills] executing: ${state.selectedSkillId}`);

    const body = this.registry.getSkillBody(state.selectedSkillId) ?? "";
    if (!body) {
      return {
        ...state,
        skillBodyLoaded: true,
      };
    }

    console.log("[skills] body loaded:\n" + body);

    const detailsBlock = [
      "",
      "Selected skill details:",
      body,
    ].join("\n");

    return {
      ...state,
      skillsPrompt: [state.skillsPrompt ?? "", detailsBlock]
        .filter(Boolean)
        .join("\n\n"),
      skillBodyLoaded: true,
    };
  }
}
