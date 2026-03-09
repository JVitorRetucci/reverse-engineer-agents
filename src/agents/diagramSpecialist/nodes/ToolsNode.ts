import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";

interface IToolsNodeParams<T> {
  tools: T[];
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

  constructor(params?: IToolsNodeParams<T>) {
    super();

    if (params?.tools) this.tools = params.tools;
  }

  public async execute(state: AgentState): Promise<AgentState> {
    console.log("ENTERING TOOL NODE");
    if (!state.messages.length) return state;

    const lastMessage = state.messages[state.messages.length - 1];

    if (!(lastMessage instanceof AIMessage)) return state;

    const toolResults = [];
    const toolCalls = lastMessage.tool_calls;

    for (const toolCall of toolCalls ?? []) {
      for (const tool of this.tools) {
        if (tool.name === toolCall.name) {
          const result = await tool.invoke(toolCall.args);
          toolResults.push({
            tool_call_id: toolCall.id as string,
            content: JSON.stringify(result),
          });
          break;
        }
      }
    }

    return {
      ...state,
      messages: [...state.messages, ...toolResults.map(res => new ToolMessage({...res}))],
    };
  }
}
