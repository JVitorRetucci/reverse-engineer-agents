import { Message } from "@a2a-js/sdk";
import {
  AgentExecutor,
  ExecutionEventBus,
  RequestContext,
} from "@a2a-js/sdk/server";
import { DefaultLLMServiceFactory } from "@agents/common/llmServices/factories/DefaultLLMServiceFactory.js";
import { MCPClientsAdapter } from "@agents/common/mcpClients/mcpAdapter.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { MainAgent } from "@agents/main/agent.js";
import { AgentsCallerNode } from "@agents/main/nodes/AgentsCallerNode.js";
import { LLMCallerNode } from "@agents/main/nodes/LLMCallerNode.js";
import { ToolsNode } from "@agents/main/nodes/ToolsNode.js";
import ConversationStore from "@agents/common/store/ConversationStore.js";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { CompiledStateGraph } from "@langchain/langgraph";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getRuntimeConfig } from "@core/RuntimeConfig.js";

export class MainAgentExecutor implements AgentExecutor {
  private agent?: CompiledStateGraph<
    AgentState,
    AgentState,
    string | "__start__"
  > = undefined;
  private mcpClientAdapter: MultiServerMCPClient;
  private conversationStore: ConversationStore;

  private serializeMessageContent(message: BaseMessage): string {
    const content = message.content;
    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((block: unknown) => {
          if (typeof block === "string") return block;
          if (block && typeof (block as any).text === "string") return (block as any).text;
          return JSON.stringify(block);
        })
        .join("");
    }

    return JSON.stringify(content ?? "");
  }

  constructor() {
    const runtime = getRuntimeConfig();
    this.mcpClientAdapter = MCPClientsAdapter.getMultipleClientsConnection({
      mcpServers: {
        "metrics-extractor": {
          command: "npm",
          args: [
            "run",
            "--prefix",
            runtime.mcp_servers.metrics_extractor_path,
            "mcp-server/metrics-extractor",
          ],
        },
      },
    });

    this.initializeAgent();
    // inicializa store de conversas (file-backed por padrão)
    try {
      this.conversationStore = ConversationStore.init(runtime.conversation_store_path);
    } catch (e) {
      // fallback para store em memória
      // @ts-ignore
      this.conversationStore = ConversationStore.init(":memory:");
    }
  }

  private mapUserMessageToAgentMessages(
    requestContext: RequestContext,
  ): BaseMessage[] {
    const parts = requestContext.userMessage.parts ?? [];

    const textParts = parts
      .filter((part) => part.kind === "text" && "text" in part)
      .map((part: any) => part.text as string);

    const content =
      textParts.length > 0 ? textParts.join("\n\n") : JSON.stringify(parts);

    // Para este projeto, qualquer mensagem que chega ao agente principal
    // deve ser tratada como entrada do "usuário" do ponto de vista do LLM,
    // mesmo quando vem de outro agente via A2A.
    return [new HumanMessage(content)];
  }
  private createAgentTools(
    agents: Record<string, string>,
  ): DynamicStructuredTool<z.ZodObject<any, any, any, any>>[] {
    return Object.entries(agents).map(([agentName, agentUrl]) => {
      const AgentToolSchema = z.object({
        message: z
          .string()
          .describe(`Message to be sent to agent '${agentName}'.`),
      });

      return new DynamicStructuredTool({
        name: agentName,
        description: `Call agent '${agentName}' via A2A. Use this tool to delegate some task or ask some specific question to the '${agentName}' agent.`,
        schema: AgentToolSchema,
        func: async ({ message }) => {
          return JSON.stringify({
            message: "This tool is processed by AgentsCallerNode",
            agent: agentName,
            originalMessage: message,
          });
        },
      });
    });
  }

  private async initializeAgent(): Promise<void> {
    const allMcpTools = await this.mcpClientAdapter.getTools();

    const agentsConfig: Record<string, string> = {
      // "metrics-agent": "http://localhost:4201/.well-known/agent-card.json",
      // "artifact-extractor-agent":
        // "http://localhost:4202/.well-known/agent-card.json",
      "architecture-contract-validator-agent":
        "http://localhost:4101/.well-known/agent-card.json",
      "architecture-contract-extractor-agent":
        "http://localhost:4102/.well-known/agent-card.json",
      "usecase-specialist-agent":
        "http://localhost:4103/.well-known/agent-card.json",
      // "diagram-specialist-agent":
        // "http://localhost:4203/.well-known/agent-card.json",
    };

    const agentTools = this.createAgentTools(agentsConfig);

    // const allTools = [...allMcpTools, ...agentTools];
    const allTools = [...agentTools];

    const llmService = new DefaultLLMServiceFactory().create({
      tools: allTools,
    });

    const llmNode = new LLMCallerNode(llmService);
    const toolsNode = new ToolsNode({
      tools: allMcpTools,
      agentName: "main-agent",
    });

    const agentsCallerNode = new AgentsCallerNode({
      agents: agentsConfig,
    });

    const agentCompiler = new MainAgent({
      llmCallerNode: llmNode,
      toolsNode: toolsNode,
      agentsCallerNode: agentsCallerNode,
    });

    this.agent =
      (await agentCompiler.getNewAgentInstance()) as CompiledStateGraph<
        AgentState,
        AgentState,
        string | "__start__"
      >;
  }

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus,
  ): Promise<void> {
    if (!this.agent) await this.initializeAgent();
    if (!this.agent) return;

    const mappedMessages = this.mapUserMessageToAgentMessages(requestContext);
    const contextId = requestContext.contextId;

    // Carrega histórico do store (se existir) e converte para BaseMessage[]
    let stateMessages = mappedMessages;
    let storedHistoryLength = 0;
    if (contextId) {
      try {
        const stored = this.conversationStore.loadHistory(contextId, { window: 20 });
        storedHistoryLength = stored.length;
        const converted = stored.map((s) => {
          const content = s.content;
          const role = (s.role || "user").toString();
          if (role === "user" || role === "human") return new HumanMessage(content);
          if (role === "assistant" || role === "ai" || role === "agent") return new AIMessage(content);
          return new ToolMessage({ tool_call_id: `${contextId}_${requestContext.taskId}`, content: content });
        });
        stateMessages = [...converted, ...mappedMessages];
      } catch (e) {
        console.warn("ConversationStore load failed, continuing without history", e);
      }
    }

    let result: AgentState;
    try {
      const initialIteration =
        requestContext.userMessage.role === "user"
          ? 0
          : (Number(requestContext.userMessage.metadata?.iterationLevel ?? 0) + 1);
      const isFirstResponse = storedHistoryLength === 0;

      result = (await this.agent.invoke(
        {
          iterationLevel:
          requestContext.userMessage.role === "user"
          ? 0
          : (requestContext.userMessage.metadata?.iterationLevel ?? 0 + 1),
          isFirstResponse,
          messages: stateMessages,
        },
        { recursionLimit: 100, runName: "Main Agent" },
      )) as AgentState;
    } catch (error) {
      console.error("Unhandled error while executing MainAgent graph:", error);

      const responseMessage: Message = {
        kind: "message",
        messageId: uuidv4(),
        role: "agent",
        parts: [
          {
            kind: "data",
            data: {
              content:
                "The MainAgent encountered an internal error while orchestrating the task. Check server logs for more details.",
              type: "error",
            },
          },
        ],
        contextId: requestContext.contextId,
      };

      eventBus.publish(responseMessage);
      eventBus.finished();
      return;
    }

    console.log(`Received message from: ${requestContext.userMessage.role}`);
    console.log(`Messages:\n`);

    result.messages.forEach((msg) =>
      console.log(`\n======= [${msg.type}] =======
      \n${msg.content}`),
    );

    const lastMessage =
      result.messages[
        result.messages.length > 0 ? result.messages.length - 1 : 0
      ];

    const responseMessage: Message = {
      kind: "message",
      messageId: uuidv4(),
      role: "agent",
      parts: [
        {
          kind: "data",
          data: {
            content: this.serializeMessageContent(lastMessage),
            type: lastMessage.type,
          },
        },
      ],
      contextId: requestContext.contextId,
    };

    console.log(`Responded:\n`);
    console.log({ responseMessage });

    eventBus.publish(responseMessage);
    eventBus.finished();

    // Persiste mensagens geradas no store (se houver contextId)
    if (contextId) {
      try {
        const toAppend = (result.messages ?? []).map((m: any) => {
          const rawType = typeof m?._getType === 'function' ? m._getType() : m.type;
          let role = rawType;
          if (rawType === 'human') role = 'user';
          if (rawType === 'ai') role = 'assistant';
          const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? '');
          return { role, content, timestamp: Date.now() };
        });
        this.conversationStore.appendMessages(contextId, toAppend);
      } catch (e) {
        console.warn('Failed to append messages to ConversationStore', e);
      }
    }
  }

  async cancelTask(
    taskId: string,
    eventBus: ExecutionEventBus,
  ): Promise<void> {}
}
