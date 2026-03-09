import { BaseAgent } from "@agents/common/agents/BaseAgent.js";
import createDebugGraph from "@agents/common/utils/createDebugGraph.js";
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
import { AgentsCallerNode } from "@agents/architectureContractValidator/nodes/AgentsCallerNode.js";
import { LLMCallerNode } from "@agents/architectureContractValidator/nodes/LLMCallerNode.js";
import { ToolsNode } from "@agents/architectureContractValidator/nodes/ToolsNode.js";

interface IArchitectureContractValidatorAgentParams {
  llmCallerNode: LLMCallerNode;
  toolsNode: ToolsNode;
  agentsCallerNode: AgentsCallerNode;
}

export class ArchitectureContractValidatorAgent extends BaseAgent<AgentState> {
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
  }: IArchitectureContractValidatorAgentParams) {
    super();

    this.colorCode = "\x1b[36m";

    this.agentsCallerNode = agentsCallerNode;
    this.toolsNode = toolsNode;

    this.setNodes({
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
      .addNode(
        this.NODE_NAMES.llm_caller_node,
        this.nodes[this.NODE_NAMES.llm_caller_node],
      )
      .addNode(
        this.NODE_NAMES.mcp_adapter_node,
        this.nodes[this.NODE_NAMES.mcp_adapter_node],
      )
      .addNode(
        this.NODE_NAMES.agents_caller_node,
        this.nodes[this.NODE_NAMES.agents_caller_node],
      )
      .addEdge(START, this.NODE_NAMES.llm_caller_node)
      .addEdge(this.NODE_NAMES.mcp_adapter_node, this.NODE_NAMES.llm_caller_node)
      .addEdge(
        this.NODE_NAMES.agents_caller_node,
        this.NODE_NAMES.llm_caller_node,
      )
      .addConditionalEdges({
        source: this.NODE_NAMES.llm_caller_node,
        path: this.pathRouter.bind(this),
        pathMap: {
          [END]: END,
          [this.NODE_NAMES.mcp_adapter_node]: this.NODE_NAMES.mcp_adapter_node,
          [this.NODE_NAMES.agents_caller_node]: this.NODE_NAMES.agents_caller_node,
        },
      });

    const agent = agentGraph.compile();

    await createDebugGraph("architecture_contract_validator_agent_graph", agent);

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
        `Max iteration level (${this.MAX_ITERATIONS}) reached. Ending execution.`,
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
      this.agentsCallerNode.isAgentToolCall(toolCall.name),
    );

    if (hasAgentToolCalls) {
      return this.NODE_NAMES.agents_caller_node;
    }

    return this.NODE_NAMES.mcp_adapter_node;
  }
}