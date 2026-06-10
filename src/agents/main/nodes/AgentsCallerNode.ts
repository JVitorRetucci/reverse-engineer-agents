import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { A2AClient } from "@a2a-js/sdk/client";
import { Message, MessageSendParams } from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";
import ConversationStore from "@agents/common/store/ConversationStore.js";

interface IAgentsCallerNodeParams {
  agents: Record<string, string>; // { [agent_name]: agent_url }
}

export class AgentsCallerNode extends Node<AgentState> {
  private agents: Record<string, string> = {};
  private agentClients: Map<string, A2AClient> = new Map();

  constructor(params?: IAgentsCallerNodeParams) {
    super();
    if (params?.agents) {
      this.agents = params.agents;
    }
  }

  private async getAgentClient(agentName: string): Promise<A2AClient | null> {
    const agentUrl = this.agents[agentName];
    if (!agentUrl) return null;

    // Cache do cliente para evitar recriar a cada chamada
    if (!this.agentClients.has(agentName)) {
      try {
        const client = await A2AClient.fromCardUrl(agentUrl);
        this.agentClients.set(agentName, client);
      } catch (error) {
        console.error(`Error while creating A2A clients for '${agentName}':`, error);
        return null;
      }
    }

    return this.agentClients.get(agentName) || null;
  }

  private convertToolCallArgsToA2AMessage(args: any, iterationLevel: number): MessageSendParams {
    const messageText = args.message || args.text || JSON.stringify(args);

    return {
      message: {
        messageId: uuidv4(),
        role: "agent",
        parts: [{ kind: "text", text: messageText }],
        kind: "message",
        metadata: { iterationLevel },
      },
    };
  }

  private convertA2AMessageToToolMessage(
    a2aMessage: Message,
    toolCallId: string
  ): ToolMessage {
    let content = "";
    if (a2aMessage.parts && a2aMessage.parts.length > 0) {
      const firstPart = a2aMessage.parts[0];
      if ("text" in firstPart) {
        content = firstPart.text;
      } else if ("data" in firstPart && firstPart.data) {
        content =
          typeof firstPart.data === "string"
            ? firstPart.data
            : JSON.stringify(firstPart.data);
      } else {
        content = JSON.stringify(firstPart);
      }
    }

    return new ToolMessage({
      tool_call_id: toolCallId,
      content: content,
    });
  }

  public isAgentToolCall(toolName: string): boolean {
    return toolName in this.agents;
  }

  public async execute(state: AgentState): Promise<AgentState> {
    console.log("ENTERING AGENTS CALLER NODE");
    if (!state.messages.length) return state;

    const lastMessage = state.messages[state.messages.length - 1];

    if (!(lastMessage instanceof AIMessage)) return state;

    const toolResults: ToolMessage[] = [];
    const iterationErrorResults: ToolMessage[] = [];
    const toolCalls = lastMessage.tool_calls;

    for (const toolCall of toolCalls ?? []) {
      if (!this.isAgentToolCall(toolCall.name)) {
        continue;
      }

      const agentClient = await this.getAgentClient(toolCall.name);
      
      if (!agentClient) {
        console.error(
          `It was not possible to create an A2A client for '${toolCall.name}' agent. Check the URL at the agent's card.`
        );
        toolResults.push(
          new ToolMessage({
            tool_call_id: toolCall.id as string,
            content: JSON.stringify({
              error: `Could not connect to '${toolCall.name}' agent. Check if the agent is available and whether its URL is correct at the agent's card.`,
            }),
          })
        );
        continue;
      }

      try {
        const sendParams = this.convertToolCallArgsToA2AMessage(
          toolCall.args,
          state.iterationLevel ?? 0,
        );

        
        const response = await agentClient.sendMessage(sendParams);

        if ("error" in response) {
          console.error(
            `Error while calling '${toolCall.name}' agent:`,
            response.error.message
          );
          
          toolResults.push(
            new ToolMessage({
              tool_call_id: toolCall.id as string,
              content: JSON.stringify({
                error: response.error.message,
              }),
            })
          );
        } else {
          const toolMessage = this.convertA2AMessageToToolMessage(
            response.result as Message,
            toolCall.id as string
          );
          try {
            const parsed = JSON.parse(toolMessage.content);
            if (parsed && parsed.type === "iteration_error") {
              iterationErrorResults.push(toolMessage);
            } else {
              toolResults.push(toolMessage);
            }
          } catch (e) {
            toolResults.push(toolMessage);
          }
        }
      } catch (error) {
        console.error(
          `Failed to call '${toolCall.name}' agent:`,
          error
        );
        
        toolResults.push(
          new ToolMessage({
            tool_call_id: toolCall.id as string,
            content: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          })
        );
      }
    }

    if (toolResults.length === 0 && iterationErrorResults.length === 0) return state;

    // Persist tool/agent results if contextId exists
    try {
      const contextId: string | undefined = (state as any).contextId;
      if (contextId && toolResults.length > 0) {
        const store = ConversationStore.init(process.env.CONVO_STORE_PATH ?? "data/conversations");
        const toAppend = toolResults.map((t) => ({ role: "tool", content: typeof t.content === 'string' ? t.content : JSON.stringify(t.content) }));
        store.appendMessages(contextId, toAppend as any);
      }
    } catch (e) {
      console.warn('AgentsCallerNode: failed to persist agent/tool results', e);
    }

    return {
      ...state,
      messages: [
        ...state.messages,
        ...iterationErrorResults,
        ...toolResults,
      ],
    };
  }
}
