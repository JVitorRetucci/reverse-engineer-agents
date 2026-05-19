import createDebugGraph from "@agents/common/utils/createDebugGraph.js";
import { LLMCallerNode } from "@agents/main/nodes/LLMCallerNode.js";
import { AIMessage } from "@langchain/core/messages";
import { CompiledStateGraph, END, START, StateGraph } from "@langchain/langgraph";
import {
  AgentState,
  AgentStateSchema,
} from "@root/agents/common/states/AgentState.js";
import { AgentsCallerNode } from "./nodes/AgentsCallerNode.js";
import { BaseAgent } from "@agents/common/agents/BaseAgent.js";
import { SkillsContextNode } from "@agents/common/nodes/SkillsContextNode.js";
import { SkillBodyLoaderNode } from "@agents/common/nodes/SkillBodyLoaderNode.js";

interface IMainAgentParams {
  llmCallerNode: LLMCallerNode;
  agentsCallerNode: AgentsCallerNode;
  skillsContextNode: SkillsContextNode;
  skillBodyLoaderNode: SkillBodyLoaderNode;
}
export class MainAgent extends BaseAgent<AgentState> {
  private readonly NODE_NAMES: Record<string, string> = {
    skills_context_node: "SKILLS_CONTEXT_NODE",
    skill_body_node: "SKILL_BODY_NODE",
    llm_caller_node: "LLM_CALLER_NODE",
    agents_caller_node: "AGENTS_CALLER_NODE",
  };
  private agentsCallerNode: AgentsCallerNode;
  private skillsContextNode: SkillsContextNode;
  private skillBodyLoaderNode: SkillBodyLoaderNode;

  constructor({
    llmCallerNode,
    agentsCallerNode,
    skillsContextNode,
    skillBodyLoaderNode,
  }: IMainAgentParams) {
    super();
    
    this.agentsCallerNode = agentsCallerNode;
    this.skillsContextNode = skillsContextNode;
    this.skillBodyLoaderNode = skillBodyLoaderNode;
    this.setNodes({
      [this.NODE_NAMES.skills_context_node]: (state: AgentState) => {
        this.printDebugMessage("entering **skillsContextNode**...");
        return skillsContextNode.execute(state);
      },
      [this.NODE_NAMES.skill_body_node]: (state: AgentState) => {
        this.printDebugMessage("entering **skillBodyLoaderNode**...");
        return skillBodyLoaderNode.execute(state);
      },
      // Sent as lambda function to keep context
      [this.NODE_NAMES.llm_caller_node]: (state: AgentState) =>
        {
          this.printDebugMessage("entering **llmCallerNode**...")
          return llmCallerNode.execute(state)
        },
      [this.NODE_NAMES.agents_caller_node]: (state: AgentState) =>
        {
          this.printDebugMessage("entering **agentsCallerNode**...")
          return agentsCallerNode.execute(state)
        },
    });
  }

  protected async compileGraph(): Promise<CompiledStateGraph<
    AgentState,
    AgentState,
    string | "__start__"
  >> {
    const agentGraph = new StateGraph(AgentStateSchema)

      // === Define nodes ===
      .addNode(
        this.NODE_NAMES.skills_context_node,
        this.nodes[this.NODE_NAMES.skills_context_node]
      )
      .addNode(
        this.NODE_NAMES.skill_body_node,
        this.nodes[this.NODE_NAMES.skill_body_node]
      )
      .addNode(
        this.NODE_NAMES.llm_caller_node,
        this.nodes[this.NODE_NAMES.llm_caller_node]
      )
      .addNode(
        this.NODE_NAMES.agents_caller_node,
        this.nodes[this.NODE_NAMES.agents_caller_node]
      )

      // === Define static edges ===
      .addEdge(START, this.NODE_NAMES.skills_context_node)
      .addEdge(
        this.NODE_NAMES.skills_context_node,
        this.NODE_NAMES.llm_caller_node
      )
      .addEdge(
        this.NODE_NAMES.skill_body_node,
        this.NODE_NAMES.llm_caller_node
      )
      .addEdge(
        this.NODE_NAMES.agents_caller_node,
        this.NODE_NAMES.llm_caller_node
      )

      // === Define conditional edges ===
      .addConditionalEdges({
        source: this.NODE_NAMES.llm_caller_node,
        path: this.pathRouter.bind(this),
        pathMap: {
          [END]: END,
          [this.NODE_NAMES.skill_body_node]: this.NODE_NAMES.skill_body_node,
          [this.NODE_NAMES.agents_caller_node]:
            this.NODE_NAMES.agents_caller_node,
        },
      });

    const agent = agentGraph.compile();

    await createDebugGraph("main_agent_graph", agent);

    return agent as CompiledStateGraph<
    AgentState,
    AgentState,
    string | "__start__"
  >;
  }

  protected pathRouter(state: AgentState): string {
    const currentIteration = state.iterationLevel ?? 0;
    if (currentIteration >= this.MAX_ITERATIONS) {
      console.warn(
        `Max iteration level (${this.MAX_ITERATIONS}) reached. Ending execution.`
      );
      return END;
    }

    const lastMessage = state.messages[state.messages.length - 1];

    if (!(lastMessage instanceof AIMessage)) {
      return END;
    }

    if (state.selectedSkillId && !state.skillBodyLoaded) {
      return this.NODE_NAMES.skill_body_node;
    }

    const toolCalls = lastMessage.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      return END;
    }

    const hasAgentToolCalls = toolCalls.some((toolCall) =>
      this.agentsCallerNode.isAgentToolCall(toolCall.name)
    );

    if (hasAgentToolCalls) {
      return this.NODE_NAMES.agents_caller_node;
    }

    return END;
  }
}
