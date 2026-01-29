/**
 * 📚 PADRÃO PARA FUTUROS AGENTES
 *
 * Use este arquivo como referência ao criar novos agentes.
 * A estrutura segue o mesmo padrão dos agentes existentes.
 */

import { AgentExecutor, RequestContext, ExecutionEventBus } from "@a2a-js/sdk/server";
import { CompiledStateGraph } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { AgentState } from "@agents/common/states/AgentState.js";

/**
 * TEMPLATE para novo executor de agente
 *
 * Copie este template e adapte para seu agente:
 *
 * 1. Renomear classe (ex: NovoAgentExecutor)
 * 2. Implementar loadMCPTools() com suas tools específicas
 * 3. Implementar loadAgentDependencies() com suas dependências
 * 4. Adicionar entrada em agents.config.json
 */
export class TemplateAgentExecutor implements AgentExecutor {
  private agent?: CompiledStateGraph<
    AgentState,
    AgentState,
    string | "__start__"
  > = undefined;

  constructor() {
    this.initializeAgent();
  }

  /**
   * Mapeia mensagens do usuário para formato LangChain
   */
  private mapUserMessageToAgentMessages(
    requestContext: RequestContext
  ): BaseMessage[] {
    const parts = requestContext.userMessage.parts ?? [];
    const role = requestContext.userMessage.role;

    const textParts = parts
      .filter((part) => part.kind === "text" && "text" in part)
      .map((part: any) => part.text as string);

    const content =
      textParts.length > 0 ? textParts.join("\n\n") : JSON.stringify(parts);

    if (role === "agent") {
      const { AIMessage } = require("@langchain/core/messages");
      return [new AIMessage(content)];
    } else {
      const { HumanMessage } = require("@langchain/core/messages");
      return [new HumanMessage(content)];
    }
  }

  /**
   * Carrega tools MCP específicas deste agente
   * Sobrescreva este método com suas tools
   */
  private async loadMCPTools() {
    // TODO: Implementar carregamento de tools MCP
    // Exemplo:
    // const mcpAdapter = MCPClientsAdapter.getMultipleClientsConnection({
    //   mcpServers: {
    //     "seu-mcp-server": {
    //       command: "npm",
    //       args: ["run", "mcp-server/seu-servidor"],
    //     },
    //   },
    // });
    // return mcpAdapter.getTools();
    return [];
  }

  /**
   * Carrega dependências específicas deste agente
   * Sobrescreva este método para customizar
   */
  private async loadAgentDependencies() {
    // TODO: Implementar carregamento de dependências
    // Retornar objeto com suas dependências customizadas
    return {
      llmService: null,
      toolsNode: null,
      agentsCallerNode: null,
    };
  }

  /**
   * Inicializa o grafo do agente
   */
  private async initializeAgent(): Promise<void> {
    // Carregar tools e dependências
    const mcpTools = await this.loadMCPTools();
    const deps = await this.loadAgentDependencies();

    // TODO: Compilar o grafo do agente usando LangGraph
    // Exemplo:
    // const agent = new TemplateAgent({
    //   llmCallerNode: deps.llmService,
    //   toolsNode: deps.toolsNode,
    //   agentsCallerNode: deps.agentsCallerNode,
    // });
    // this.agent = await agent.getNewAgentInstance();
  }

  /**
   * Executa o agente com a mensagem do usuário
   */
  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    if (!this.agent) await this.initializeAgent();
    if (!this.agent) {
      console.error("Failed to initialize agent");
      return;
    }

    const mappedMessages = this.mapUserMessageToAgentMessages(requestContext);

    const result = (await this.agent.invoke({
      iterationLevel:
        requestContext.userMessage.role === "user"
          ? 0
          : requestContext.userMessage.metadata?.iterationLevel ?? 0 + 1,
      messages: mappedMessages,
    })) as AgentState;

    console.log(`Received message from: ${requestContext.userMessage.role}`);
    console.log(`Messages:\n`);

    result.messages.forEach((msg) =>
      console.log(`\n======= [${msg.type}] =======\n${msg.content}`)
    );

    const lastMessage =
      result.messages[
        result.messages.length > 0 ? result.messages.length - 1 : 0
      ];

    // TODO: Construir resposta apropriada para seu agente
    const responseMessage = {
      kind: "message" as const,
      messageId: require("uuid").v4(),
      role: "agent" as const,
      parts: [
        {
          kind: "data" as const,
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

  /**
   * Cancela uma tarefa em execução
   */
  async cancelTask(
    taskId: string,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    // TODO: Implementar lógica de cancelamento
    console.log(`Canceling task ${taskId}`);
  }
}

/**
 * CONFIGURAÇÃO JSON CORRESPONDENTE
 *
 * Adicione esta entrada em agents.config.json:
 *
 * {
 *   "id": "template",
 *   "name": "Template Agent",
 *   "description": "Agente template para referência",
 *   "port": 4999,
 *   "executorPath": "./src/agents/template/executor.ts",
 *   "executorClass": "TemplateAgentExecutor",
 *   "skill": {
 *     "id": "template_skill",
 *     "name": "Template Skill",
 *     "description": "Uma skill template",
 *     "tags": ["template", "example"],
 *     "examples": ["Exemplo de uso"]
 *   }
 * }
 */
