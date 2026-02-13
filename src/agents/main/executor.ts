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
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { CompiledStateGraph } from "@langchain/langgraph";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

export class MainAgentExecutor implements AgentExecutor {
  private agent?: CompiledStateGraph<
    AgentState,
    AgentState,
    string | "__start__"
  > = undefined;
  private mcpClientAdapter: MultiServerMCPClient;

  constructor() {
    this.mcpClientAdapter = MCPClientsAdapter.getMultipleClientsConnection({
      mcpServers: {
        "metrics-extractor": {
          command: "npm",
          args: [
            "run",
            "--prefix",
            process.env.METRICS_MCP_PATH ?? "",
            "mcp-server/metrics-extractor",
          ],
        },
      },
    });

    this.initializeAgent();
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
      "metrics-agent": "http://localhost:4201/.well-known/agent-card.json",
      "artifact-extractor-agent":
        "http://localhost:4202/.well-known/agent-card.json",
    };

    const agentTools = this.createAgentTools(agentsConfig);

    // const allTools = [...allMcpTools, ...agentTools];
    const allTools = [...agentTools];

    const llmService = new DefaultLLMServiceFactory().create({
      tools: allTools,
    });

    const llmNode = new LLMCallerNode(llmService);
    const toolsNode = new ToolsNode({ tools: allMcpTools });

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

    const result = (await this.agent.invoke({
      iterationLevel:
        requestContext.userMessage.role === "user"
          ? 0
          : (requestContext.userMessage.metadata?.iterationLevel ?? 0 + 1),
      messages: mappedMessages,
    })) as AgentState;

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
            content: lastMessage.content,
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
  }

  async cancelTask(
    taskId: string,
    eventBus: ExecutionEventBus,
  ): Promise<void> {}
}
