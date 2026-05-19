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
import { ArchitectureContractValidatorAgent } from "./agent.js";
import { AgentsCallerNode } from "@agents/architectureContractValidator/nodes/AgentsCallerNode.js";
import { LLMCallerNode } from "@agents/architectureContractValidator/nodes/LLMCallerNode.js";
import { SkillRegistry } from "@agents/common/skills/SkillRegistry.js";
import { SkillsContextNode } from "@agents/common/nodes/SkillsContextNode.js";
import { SkillBodyLoaderNode } from "@agents/common/nodes/SkillBodyLoaderNode.js";

export class ArchitectureContractValidatorAgentExecutor
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
        description: `Call agent '${agentName}' via A2A. Use this tool to collect specific evidence required to validate architecture contracts.`,
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
      "metrics-agent": "http://localhost:4201/.well-known/agent-card.json",
      "artifact-extractor-agent":
        "http://localhost:4202/.well-known/agent-card.json",
    };

    const agentTools = this.createAgentTools(agentsConfig);

    const llmService = new DefaultLLMServiceFactory().create({
      tools: agentTools,
    });

    const skillRegistry = new SkillRegistry();
    await skillRegistry.loadFromDir(undefined, { agentName: "architectureContractValidator" });
    const skillIds = [
      "pec-selector",
      "result-merger",
      ...skillRegistry.getAgentSkillIds("architectureContractValidator"),
    ];
    const skillsPrompt = skillRegistry.getPromptForSkills(skillIds);

    const llmNode = new LLMCallerNode(llmService);
    const skillsContextNode = new SkillsContextNode(skillsPrompt);
    const skillBodyLoaderNode = new SkillBodyLoaderNode(skillRegistry);
    const agentsCallerNode = new AgentsCallerNode({
      agents: agentsConfig,
    });

    const agentCompiler = new ArchitectureContractValidatorAgent({
      llmCallerNode: llmNode,
      agentsCallerNode: agentsCallerNode,
      skillsContextNode: skillsContextNode,
      skillBodyLoaderNode: skillBodyLoaderNode,
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
      result = (await this.agent.invoke(
        {
          iterationLevel:
            requestContext.userMessage.role === "user"
              ? 0
              : (requestContext.userMessage.metadata?.iterationLevel ?? 0 + 1),
          messages: mappedMessages,
        },
        { recursionLimit: 100, runName: "Architecture Contract Validator Agent" },
      )) as AgentState;
    } catch (error) {
      console.error(
        "Unhandled error while executing ArchitectureContractValidatorAgent graph:",
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
                "O ArchitectureContractValidatorAgent encontrou um erro interno ao processar a tarefa. Verifique os logs do servidor para mais detalhes.",
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
