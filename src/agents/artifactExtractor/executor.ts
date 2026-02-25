import { Message } from "@a2a-js/sdk";
import {
  AgentExecutor,
  ExecutionEventBus,
  RequestContext,
} from "@a2a-js/sdk/server";
import { AgentsCallerNode } from "@agents/artifactExtractor/nodes/AgentsCallerNode.js";
import { LLMCallerNode } from "@agents/artifactExtractor/nodes/LLMCallerNode.js";
import { ToolsNode } from "@agents/artifactExtractor/nodes/ToolsNode.js";
import { DefaultLLMServiceFactory } from "@agents/common/llmServices/factories/DefaultLLMServiceFactory.js";
import { MCPClientsAdapter } from "@agents/common/mcpClients/mcpAdapter.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { CompiledStateGraph } from "@langchain/langgraph";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { ArtifactExtractorAgent } from "./agent.js";

export class ArtifactExtractorAgentExecutor implements AgentExecutor {
  private agent?: CompiledStateGraph<
    AgentState,
    AgentState,
    string | "__start__"
  > = undefined;
  private mcpClientAdapter: MultiServerMCPClient;

  constructor() {
    this.mcpClientAdapter = MCPClientsAdapter.getMultipleClientsConnection({
      mcpServers: {
        "artifact-extractor": {
          command: "npm",
          args: [
            "run",
            "--prefix",
            process.env.ARTIFACT_EXTRACTOR_MCP_PATH ?? "",
            "mcp-server/artifact-extractor",
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

    // Para os agentes internos, tratamos qualquer mensagem recebida
    // (user ou agent no protocolo A2A) como entrada "humana" para o LLM.
    // Isso evita que o Gemini receba turnos terminando com role=model.
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
        description: `Call agent '${agentName}' via A2A. Use this tool when needed to delegate some task or ask some specific question to the '${agentName}' agent.`,
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
      // "main-agent": "http://localhost:4000/.well-known/agent-card.json",
    };

    const agentTools = this.createAgentTools(agentsConfig);

    const allTools = [...allMcpTools, ...agentTools];

    const llmService = new DefaultLLMServiceFactory().create({
      tools: allTools,
    });

    const llmNode = new LLMCallerNode(llmService);
    const toolsNode = new ToolsNode({ tools: allMcpTools });
    const agentsCallerNode = new AgentsCallerNode({
      agents: agentsConfig,
    });

    const agentCompiler = new ArtifactExtractorAgent({
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
    }, { recursionLimit: 100 })) as AgentState;

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
