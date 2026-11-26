import createDebugGraph from "@agents/common/utils/createDebugGraph.js";
import { LLMCallerNode } from "@agents/metrics/nodes/LLMCallerNode.js";
import { ToolsNode } from "@agents/metrics/nodes/ToolsNode.js";
import { AIMessage } from "@langchain/core/messages";
import {
  CompiledStateGraph,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import {
  AgentState,
  AgentStateSchema,
} from "@root/agents/common/states/AgentState.js";
import { AgentsCallerNode } from "./nodes/AgentsCallerNode.js";
import { BaseAgent } from "@agents/common/agents/BaseAgent.js";

interface IMetricsAgentParams {
  llmCallerNode: LLMCallerNode;
  toolsNode: ToolsNode;
  agentsCallerNode: AgentsCallerNode;
}
export class MetricsAgent extends BaseAgent<AgentState> {
  private readonly NODE_NAMES: Record<string, string> = {
    llm_caller_node: "LLM_CALLER_NODE",
    mcp_adapter_node: "MCP_ADAPTER_NODE",
    agents_caller_node: "AGENTS_CALLER_NODE",
  };

  private agentsCallerNode: AgentsCallerNode;
  private toolsNode: ToolsNode;

  constructor({
    llmCallerNode,
    toolsNode,
    agentsCallerNode,
  }: IMetricsAgentParams) {
    super();

    this.colorCode = "\x1b[32m";

    this.agentsCallerNode = agentsCallerNode;
    this.toolsNode = toolsNode;

    this.setNodes({
      // Sent as lambda function to keep context
      [this.NODE_NAMES.llm_caller_node]: (state: AgentState) => {
        this.printDebugMessage("entering **llmCallerNode**...");
        return llmCallerNode.execute(state);
      },
      [this.NODE_NAMES.mcp_adapter_node]: (state: AgentState) => {
        this.printDebugMessage("entering **toolsNode**...");
        return toolsNode.execute(state);
      },
      [this.NODE_NAMES.agents_caller_node]: (state: AgentState) => {
        this.printDebugMessage("entering **agentsCallerNode**...");
        return agentsCallerNode.execute(state);
      },
    });
  }

  protected async compileGraph(): Promise<
    CompiledStateGraph<AgentState, AgentState, string | "__start__">
  > {
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
        path: this.pathRouter.bind(this),
        pathMap: {
          [END]: END,
          [this.NODE_NAMES.mcp_adapter_node]: this.NODE_NAMES.mcp_adapter_node,
          [this.NODE_NAMES.agents_caller_node]:
            this.NODE_NAMES.agents_caller_node,
        },
      });

    const agent = agentGraph.compile();

    await createDebugGraph("metrics_agent_graph", agent);

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

    return this.NODE_NAMES.mcp_adapter_node;
  }
}
