import { CriticalError } from "@core/Errors/CriticalError.js";
import {
  ILLMServiceParams,
  LLMService,
} from "@domain/agents/common/LLMService.js";
import { ChatOpenRouter } from "@langchain/openrouter";
import { BaseMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { normalizeLLMResponse } from "./LLMResponseNormalizer.js";

export interface IOpenRouterLLMServiceParams
  extends ILLMServiceParams<DynamicStructuredTool> {}

export class OpenRouterLLMService extends LLMService<
  BaseMessage[],
  BaseMessage
> {
  private llmServiceInstance: ChatOpenRouter | Runnable<any, any>;

  constructor(params?: IOpenRouterLLMServiceParams) {
    super(params);

    const baseModel = new ChatOpenRouter({
      model: params?.model ?? "poolside/laguna-xs-2.1:free",
      // model: params?.model ?? "google/gemma-4-26b-a4b-it:free",
      apiKey: params?.secretKey ?? process.env.OPEN_ROUTER_API_KEY,
      temperature: params?.temperature,
      maxTokens: params?.maxTokens,
      provider: {
        sort: "price"
      }
    });

    let modelWithTools: ChatOpenRouter | Runnable<unknown, unknown> = baseModel;

    if (params?.tools && params.tools.length > 0) {
      modelWithTools = baseModel.bindTools(params.tools);
    }

    this.llmServiceInstance = modelWithTools;
  }

  // TODO: Fazer tratamento com EITHER?
  async invoke(params: BaseMessage[]): Promise<BaseMessage> {
    try {
      const response = await this.llmServiceInstance.invoke(params);
      return normalizeLLMResponse(response);
    } catch (error) {
      throw new CriticalError(
        error as Error,
        `Critical Error while calling OpenRouterLLMService`
      );
    }
  }
}
