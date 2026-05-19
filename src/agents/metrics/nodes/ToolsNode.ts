import { Node } from "@agents/common/nodes/Node.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { AIMessage, ToolMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";

const MAX_TOOL_ATTEMPTS = 2;

interface IToolsNodeParams<T> {
  tools: T[];
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
    const attemptCounts = { ...(state.toolAttemptCounts ?? {}) };
    const updatedErrors = [...(state.errors ?? [])];
    const extraMessages: BaseMessage[] = [];
    const blockedTools = [...(state.blockedTools ?? [])];

    if (!toolCalls || toolCalls.length === 0) {
      console.log('[tools][metrics] no tool_calls present in last AI message — skipping ToolsNode');
      return state;
    }

    for (const toolCall of toolCalls) {
      for (const tool of this.tools) {
        if (tool.name === toolCall.name) {
          const attemptKey = `${tool.name}:${JSON.stringify(toolCall.args ?? {})}`;
          const attempts = (attemptCounts[attemptKey] ?? 0) + 1;
          attemptCounts[attemptKey] = attempts;

          if (attempts > MAX_TOOL_ATTEMPTS) {
            const errorPayload = {
              success: false,
              errorType: "AGENT_TOOL_EXECUTION_ERROR",
              toolName: tool.name,
              agentName: this.agentName ?? "metrics-agent",
              message: `Tool call retry limit exceeded (${MAX_TOOL_ATTEMPTS}).`,
              retryExhausted: true,
            };

            updatedErrors.push(
              `Retry limit exceeded for tool ${tool.name} (attempts: ${attempts}).`,
            );

            toolResults.push({
              tool_call_id: toolCall.id as string,
              content: JSON.stringify(errorPayload),
            });

            extraMessages.push(new SystemMessage(`TOOL_RETRY_EXHAUSTED: tool=${tool.name} args=${JSON.stringify(toolCall.args ?? {})} attempts=${attempts}. No further retries will be attempted.`));
            blockedTools.push({ toolName: tool.name, args: JSON.stringify(toolCall.args ?? {}) });

            break;
          }

          try {
            if (process.env.DEBUG_MODE === "true") {
              console.log('[tools][metrics] invoking', JSON.stringify({ tool: tool.name, args: toolCall.args }));
            }
            const result = await tool.invoke(toolCall.args);
            console.log('[tools][metrics] raw result:', JSON.stringify(result, null, 2).slice(0, 800));
            const resultContent = result?.content?.[0]?.text ? result.content[0].text.slice(0, 500) : 'no content';
            console.log('[tools][metrics] result', JSON.stringify({ tool: tool.name, resultPreview: resultContent, isError: result?.isError }));
            toolResults.push({
              tool_call_id: toolCall.id as string,
              content: JSON.stringify(result),
            });
          } catch (error) {
            console.error('[tools][metrics] error invoking', { tool: tool.name, error: error instanceof Error ? error.message : String(error), args: toolCall.args });

            const errorPayload = {
              success: false,
              errorType: "AGENT_TOOL_EXECUTION_ERROR",
              toolName: tool.name,
              agentName: this.agentName ?? "metrics-agent",
              message: error instanceof Error ? error.message : String(error),
            };

            toolResults.push({
              tool_call_id: toolCall.id as string,
              content: JSON.stringify(errorPayload),
            });

            updatedErrors.push(`Tool ${tool.name} failed: ${errorPayload.message}`);
          }

          break;
        }
      }
    }

    if (toolResults.length === 0) {
      console.warn('[tools][metrics] no tools matched for tool_calls', { toolCalls: toolCalls.map((c: any) => ({ name: c.name, id: c.id })), availableTools: this.tools.map((t) => t.name) });
    }

    return {
      ...state,
      toolAttemptCounts: attemptCounts,
      errors: updatedErrors,
      blockedTools,
      messages: [
        ...state.messages,
        ...toolResults.map((res) => new ToolMessage({ ...res })),
        ...extraMessages,
      ],
    };
  }
}
