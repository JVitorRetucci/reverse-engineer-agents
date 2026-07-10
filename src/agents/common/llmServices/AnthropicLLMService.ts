import { CriticalError } from "@core/Errors/CriticalError.js";
import {
  ILLMServiceParams,
  LLMService,
} from "@domain/agents/common/LLMService.js";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { normalizeLLMResponse } from "./LLMResponseNormalizer.js";

export interface IAnthropicLLMServiceParams
  extends ILLMServiceParams<DynamicStructuredTool> {}

export class AnthropicLLMService extends LLMService<
  BaseMessage[],
  BaseMessage
> {
  private llmServiceInstance: ChatAnthropic | Runnable<any, any>;

  constructor(params?: IAnthropicLLMServiceParams) {
    super(params);

    const baseModel = new ChatAnthropic({
      model: params?.model ?? "claude-sonnet-5",
      // model: params?.model ?? "claude-sonnet-4-20250514",
      anthropicApiKey: params?.secretKey ?? process.env.ANTHROPIC_API_KEY,
      temperature: params?.temperature,
      maxTokens: params?.maxTokens,
    });

    let modelWithTools: ChatAnthropic | Runnable<unknown, unknown> = baseModel;

    if (params?.tools && params.tools.length > 0) {
      modelWithTools = baseModel.bindTools(params.tools);
    }

    this.llmServiceInstance = modelWithTools;
  }

  // TODO: Fazer tratamento com EITHER?
  async invoke(params: BaseMessage[]): Promise<BaseMessage> {
    try {
      const response = await this.llmServiceInstance.invoke(params as any);
      return normalizeLLMResponse(response);
    } catch (error) {
      throw new CriticalError(
        error as Error,
        `Critical Error while calling AnthropicLLMService`
      );
    }
  }
}
