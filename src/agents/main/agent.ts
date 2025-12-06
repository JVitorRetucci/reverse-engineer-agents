import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentState, AgentStateSchema } from "@root/agents/common/states/AgentState.js";

import createDebugGraph from "agents/common/utils/createDebugGraph.js";
import { LLMCallerNode } from "./nodes/LLMCallerNode.js";

interface IMainAgentParams { 
  llmCallerNode: LLMCallerNode,
}
export class MainAgent {
  private readonly NODE_NAMES: Record<string, string> = {
    llm_caller_node: "NODE_LLM_CALLER",
  };

  private nodes: Record<
    string,
    (state: AgentState) => AgentState | Promise<AgentState>
  > = {};

  constructor({ llmCallerNode }: IMainAgentParams) {
    this.setNodes({
      [this.NODE_NAMES.llm_caller_node]: (state: AgentState) => llmCallerNode.execute(state),
    });
  }

  private async compileGraph() {
    const agentGraph = new StateGraph(AgentStateSchema)
      .addNode(
        this.NODE_NAMES.llm_caller_node,
        this.nodes[this.NODE_NAMES.llm_caller_node]
      )
      .addNode("TEST_NODE", (stt) => {
        console.log(`Iteration count: ${stt.iterationLevel ?? 0}\n`);

        return {
          ...stt,
          iterationLevel: (stt.iterationLevel ?? 0) + 1,
        };
      })

      .addEdge(START, this.NODE_NAMES.llm_caller_node)
      .addEdge("TEST_NODE", this.NODE_NAMES.llm_caller_node)

      .addConditionalEdges({
        source: this.NODE_NAMES.llm_caller_node,
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
