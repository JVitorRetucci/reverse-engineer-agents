import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentState, AgentStateSchema } from "agents/common/AgentState.js";

import createDebugGraph from "agents/common/utils/createDebugGraph.js";
import { NodeLLMCaller } from "./nodes/NodeLLMCaller.js";

export class MainAgent {
  private readonly NODE_NAMES: Record<string, string> = {
    node_llm_caller: "NODE_LLM_CALLER",
  };

  private nodes: Record<
    string,
    (state: AgentState) => AgentState | Promise<AgentState>
  > = {};

  constructor({ nodeLLMCaller }: { nodeLLMCaller: NodeLLMCaller }) {
    this.setNodes({
      [this.NODE_NAMES.node_llm_caller]: nodeLLMCaller.execute,
    });
  }

  private async compileGraph() {
    const agentGraph = new StateGraph(AgentStateSchema)
      .addNode(
        this.NODE_NAMES.node_llm_caller,
        this.nodes[this.NODE_NAMES.node_llm_caller]
      )
      .addNode("TEST_NODE", (stt) => {
        console.log(`Iteration count: ${stt.iterationLevel ?? 0}\n`);

        return {
          ...stt,
          iterationLevel: (stt.iterationLevel ?? 0) + 1,
        };
      })

      .addEdge(START, this.NODE_NAMES.node_llm_caller)
      .addEdge("TEST_NODE", this.NODE_NAMES.node_llm_caller)

      .addConditionalEdges({
        source: this.NODE_NAMES.node_llm_caller,
        path: (state) =>
          state.iterationLevel && state.iterationLevel > 1 ? "true" : "false",
        pathMap: {
          true: END,
          false: "TEST_NODE",
        },
      });

    const agent = agentGraph.compile();

    await createDebugGraph("main_agent_graph", agent);

    return agent;
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
