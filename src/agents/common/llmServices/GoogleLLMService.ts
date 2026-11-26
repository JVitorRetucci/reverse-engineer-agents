import { CriticalError } from "@core/Errors/CriticalError.js";
import {
  ILLMServiceParams,
  LLMService,
} from "@domain/agents/common/LLMService.js";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { normalizeLLMResponse } from "./LLMResponseNormalizer.js";

export interface IGoogleLLMServiceParams
  extends ILLMServiceParams<DynamicStructuredTool> {}

export class GoogleLLMService extends LLMService<BaseMessage[], BaseMessage> {
  private llmServiceInstance: ChatGoogleGenerativeAI | Runnable<any, any>;

  constructor(params?: IGoogleLLMServiceParams) {
    super(params);

    const baseModel = (this.llmServiceInstance = new ChatGoogleGenerativeAI({
      model: params?.model ?? "gemini-2.5-flash",
      apiKey: params?.secretKey ?? process.env.GOOGLE_GEN_AI_API_KEY,
      temperature: params?.temperature,
      maxOutputTokens: params?.maxTokens,
    }));

    let modelWithTools: ChatGoogleGenerativeAI | Runnable<unknown, unknown> = baseModel;

    if (params?.tools && params.tools.length > 0) {
      // O Gemini é mais restritivo com JSON Schema de tools (por exemplo,
      // não aceita `type: ["string", "null"]`). Para evitar o erro
      // "Invalid JSON payload received. Unknown name \"type\" ...",
      // filtramos apenas tools com schemas simples e compatíveis.
      const safeTools = params.tools.filter((tool) => {
        const schema: any = (tool as any).schema;
        if (!schema || !(schema instanceof z.ZodObject)) return false;

        const shape = (schema as z.ZodObject<any>).shape;
        const fields = Object.values(shape ?? {});

        // Consideramos "seguros" apenas objetos cujos campos são strings simples
        // (sem union/nullable/etc), o que é suficiente para os agent tools
        // definidos neste projeto.
        return fields.every((field: any) => field?._def?.typeName === "ZodString");
      });

      if (safeTools.length > 0) {
        modelWithTools = baseModel.bindTools(safeTools);
      }
    }

    this.llmServiceInstance = modelWithTools;
  }

  // TODO: Fazer tratamento com EITHER?
  async invoke(params: BaseMessage[]): Promise<BaseMessage> {
    try {
      /**
       * O backend do Gemini exige que requisições "single turn" terminem
       * com uma mensagem de usuário (role=user). No nosso grafo, porém,
       * o estado acumula também respostas anteriores do modelo (`AIMessage`)
       * e possivelmente mensagens de ferramenta, o que faz com que o último
       * item nem sempre seja `HumanMessage`.
       *
       * Para manter a mesma interface dos outros LLMs e deixar essa
       * particularidade transparente para quem usa o serviço, aqui nós:
       *  - localizamos a última `HumanMessage` na lista;
       *  - recortamos o histórico até essa posição (inclusive),
       *    garantindo que a última mensagem enviada ao Gemini seja de usuário.
       *
       * Isso preserva o comportamento esperado dos nós chamadores
       * (que sempre incluem o SystemMessage + histórico completo),
       * mas evita o erro 400 do Gemini.
       */

      const lastHumanIndex = (() => {
        for (let i = params.length - 1; i >= 0; i--) {
          const type = (params[i] as any)?._getType?.();
          if (type === "human") {
            return i;
          }
        }
        return -1;
      })();

      let sanitizedParams: BaseMessage[];

      if (lastHumanIndex >= 0) {
        // Mantém desde o começo (incluindo SystemMessage, se houver)
        // até a última HumanMessage.
        sanitizedParams = params.slice(0, lastHumanIndex + 1);
      } else if (params.length > 0) {
        // Não há HumanMessage alguma. Para o Gemini isso não é válido
        // em "single turn", então convertemos a última mensagem em
        // uma HumanMessage sintética, preservando o conteúdo.
        const last = params[params.length - 1] as any;
        const content =
          typeof last?.content === "string"
            ? last.content
            : JSON.stringify(last?.content ?? "");

        sanitizedParams = [new HumanMessage(content)];
      } else {
        sanitizedParams = params;
      }

      const response = await this.llmServiceInstance.invoke(sanitizedParams);
      return normalizeLLMResponse(response);
    } catch (error) {
      console.error({error})
      throw new CriticalError(
        error as Error,
        `Critical Error while calling GoogleLLMService`
      );
    }
  }
}
