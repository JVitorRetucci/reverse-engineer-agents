import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";

export class SkillsContextNode extends Node<AgentState> {
  private skillsPrompt: string;

  constructor(skillsPrompt: string) {
    super();
    this.skillsPrompt = skillsPrompt;
  }

  public async execute(state: AgentState): Promise<AgentState> {
    if (state.skillsPrompt && state.skillsPrompt.length > 0) {
      return state;
    }

    if (this.skillsPrompt) {
      console.log("[skills] applying skills context");
      console.log(this.skillsPrompt);
    }

    return {
      ...state,
      skillsPrompt: this.skillsPrompt || state.skillsPrompt,
    };
  }
}
