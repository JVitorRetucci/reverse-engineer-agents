import { Message } from "@a2a-js/sdk";
import {
  AgentExecutor,
  ExecutionEventBus,
  RequestContext,
} from "@a2a-js/sdk/server";
import { DefaultLLMServiceFactory } from "@agents/common/llmServices/factories/DefaultLLMServiceFactory.js";
import { AgentState } from "@agents/common/states/AgentState.js";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { CompiledStateGraph } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { ArchitectureContractExtractorAgent } from "./agent.js";
import { AgentsCallerNode } from "@agents/architectureContractExtractor/nodes/AgentsCallerNode.js";
import { LLMCallerNode } from "@agents/architectureContractExtractor/nodes/LLMCallerNode.js";
import { ToolsNode } from "@agents/architectureContractExtractor/nodes/ToolsNode.js";

export class ArchitectureContractExtractorAgentExecutor
  implements AgentExecutor
{
  private agent?: CompiledStateGraph<
    AgentState,
    AgentState,
    string | "__start__"
  > = undefined;

  constructor() {
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
        description: `Call agent '${agentName}' via A2A. Use this tool to gather concrete architecture evidence related to the use-case under analysis.`,
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
    const agentsConfig: Record<string, string> = {
      "artifact-extractor-agent":
        "http://localhost:4202/.well-known/agent-card.json",
      "metrics-agent": "http://localhost:4201/.well-known/agent-card.json",
    };

    const agentTools = this.createAgentTools(agentsConfig);

    const llmService = new DefaultLLMServiceFactory().create({
      tools: agentTools,
    });

    const llmNode = new LLMCallerNode(llmService);
    const toolsNode = new ToolsNode({
      tools: [],
      agentName: "architecture-contract-extractor-agent",
    });
    const agentsCallerNode = new AgentsCallerNode({
      agents: agentsConfig,
    });

    const agentCompiler = new ArchitectureContractExtractorAgent({
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

    let result: AgentState;
    try {
      const initialIteration =
        requestContext.userMessage.role === "user"
          ? 0
          : ((requestContext.userMessage.metadata?.iterationLevel ?? 0) + 1);

      result = (await this.agent.invoke(
        {
          iterationLevel: initialIteration,
          messages: mappedMessages,
        },
        { recursionLimit: 100, runName: "Architecture Contract Discover Agent" },
      )) as AgentState;
    } catch (error) {
      console.error(
        "Unhandled error while executing ArchitectureContractExtractorAgent graph:",
        error,
      );

      const responseMessage: Message = {
        kind: "message",
        messageId: uuidv4(),
        role: "agent",
        parts: [
          {
            kind: "data",
            data: {
              content:
                "O ArchitectureContractExtractorAgent encontrou um erro interno ao processar a tarefa. Verifique os logs do servidor para mais detalhes.",
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

    eventBus.publish(responseMessage);
    eventBus.finished();
  }

  async cancelTask(
    taskId: string,
    eventBus: ExecutionEventBus,
  ): Promise<void> {}
}