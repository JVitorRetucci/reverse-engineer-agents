import { END, START, StateGraph } from "@langchain/langgraph";
import {
  AgentState,
  AgentStateSchema,
} from "@root/agents/common/states/AgentState.js";

import createDebugGraph from "agents/common/utils/createDebugGraph.js";
import { LLMCallerNode } from "./nodes/LLMCallerNode.js";

interface IMainAgentParams {
  llmCallerNode: LLMCallerNode;
}
export class MainAgent {
  private readonly NODE_NAMES: Record<string, string> = {
    llm_caller_node: "LLM_CALLER_NODE",
    mcp_adapter_node: "MCP_ADAPTER_NODE",
    agents_caller_node: "AGENTS_CALLER_NODE",
  };

  private nodes: Record<
    string,
    (state: AgentState) => AgentState | Promise<AgentState>
  > = {};

  constructor({ llmCallerNode }: IMainAgentParams) {
    this.setNodes({
      // Sent as lambda function to keep context
      [this.NODE_NAMES.llm_caller_node]: (state: AgentState) =>
        llmCallerNode.execute(state),
      [this.NODE_NAMES.mcp_adapter_node]: (state: AgentState) => state,
      [this.NODE_NAMES.agents_caller_node]: (state: AgentState) => state,
    });
  }

  private async compileGraph() {
    const agentGraph = new StateGraph(AgentStateSchema)

      // === Define nodes ===
      .addNode(
        this.NODE_NAMES.llm_caller_node,
        this.nodes[this.NODE_NAMES.llm_caller_node]
      )
      .addNode(
        this.NODE_NAMES.mcp_adapter_node,
        this.nodes[this.NODE_NAMES.mcp_adapter_node]
      )
      .addNode(
        this.NODE_NAMES.agents_caller_node,
        this.nodes[this.NODE_NAMES.agents_caller_node]
      )

      // === Define static edges ===
      .addEdge(START, this.NODE_NAMES.llm_caller_node)
      .addEdge(
        this.NODE_NAMES.mcp_adapter_node,
        this.NODE_NAMES.llm_caller_node
      )
      .addEdge(
        this.NODE_NAMES.agents_caller_node,
        this.NODE_NAMES.llm_caller_node
      )

      // === Define conditional edges ===
      .addConditionalEdges({
        source: this.NODE_NAMES.llm_caller_node,
        path: this.pathRouter,
        pathMap: {
          [END]: END,
          [this.NODE_NAMES.mcp_adapter_node]: this.NODE_NAMES.mcp_adapter_node,
          [this.NODE_NAMES.agents_caller_node]:
            this.NODE_NAMES.agents_caller_node,
        },
      });

    const agent = agentGraph.compile();

    await createDebugGraph("main_agent_graph", agent);

    return agent;
  }

  private pathRouter(state: AgentState): string {
    // TODO: implement the router based on the LLM Caller node;
    return END
  }

  private setNodes(
    nodes: Record<
      string,
      (state: AgentState) => AgentState | Promise<AgentState>
    >
  ): void {
    this.nodes = nodes;
  }

  public async getNewAgentInstance() {
    return await this.compileGraph();
  }
}
