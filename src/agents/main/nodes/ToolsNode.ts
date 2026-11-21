import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import ConversationStore from "@agents/common/store/ConversationStore.js";
import { getRuntimeConfig } from "@core/RuntimeConfig.js";

interface IToolsNodeParams<T> {
  tools: T[];
  /**
   * Optional logical name of the agent that owns this ToolsNode.
   * Used only for logging and error payload enrichment.
   */
  agentName?: string;
}

export class ToolsNode<
  T extends DynamicStructuredTool<
    unknown,
    any,
    any,
    any
  > = DynamicStructuredTool<unknown, any, any, any>
> extends Node<AgentState> {
  tools: T[] = [];
  private readonly agentName?: string;

  constructor(params?: IToolsNodeParams<T>) {
    super();

    if (params?.tools) this.tools = params.tools;
    this.agentName = params?.agentName;
  }

  public async execute(state: AgentState): Promise<AgentState> {
    console.log("ENTERING TOOL NODE");
    if (!state.messages.length) return state;

    const lastMessage = state.messages[state.messages.length - 1];

    if (!(lastMessage instanceof AIMessage)) return state;

    const toolResults: { tool_call_id: string; content: string }[] = [];
    const toolCalls = lastMessage.tool_calls;

    for (const toolCall of toolCalls ?? []) {
      for (const tool of this.tools) {
        if (tool.name === toolCall.name) {
          try {
            const result = await tool.invoke(toolCall.args);
            toolResults.push({
              tool_call_id: toolCall.id as string,
              content: JSON.stringify(result),
            });
          } catch (error) {
            console.error(
              `Error while invoking tool "${tool.name}" from agent "${this.agentName ?? "main-agent"}":`,
              error,
            );

            const errorPayload = {
              success: false,
              errorType: "AGENT_TOOL_EXECUTION_ERROR",
              toolName: tool.name,
              agentName: this.agentName ?? "main-agent",
              message: error instanceof Error ? error.message : String(error),
            };

            toolResults.push({
              tool_call_id: toolCall.id as string,
              content: JSON.stringify(errorPayload),
            });
          }

          break;
        }
      }
    }

    // Persist tool results if we have a conversation context
    try {
      const contextId: string | undefined = (state as any).contextId;
      if (contextId && toolResults.length > 0) {
        const store = ConversationStore.init(getRuntimeConfig().conversation_store_path);
        const toAppend = toolResults.map((r) => ({ role: "tool", content: r.content }));
        store.appendMessages(contextId, toAppend as any);
        // do not close store (file-backed) to allow reuse; in-memory store will be GC'd
      }
    } catch (e) {
      console.warn("ToolsNode: failed to persist tool results", e);
    }

    return {
      ...state,
      messages: [
        ...state.messages,
        ...toolResults.map((res) => new ToolMessage({ ...res })),
      ],
    };
  }
}
