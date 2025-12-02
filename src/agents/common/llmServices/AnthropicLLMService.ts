import {
  ILLMServiceParams,
  LLMService,
} from "@domain/agents/common/LLMService.js";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseMessage } from "@langchain/core/messages";
import { CriticalError } from "@root/core/Errors/CriticalError.js";

export class AnthropicLLMService extends LLMService<
  BaseMessage[],
  BaseMessage
> {
  private llmServiceInstance: ChatAnthropic;

  constructor(params: ILLMServiceParams = {}) {
    super(params);

    this.llmServiceInstance = new ChatAnthropic({
      model: params.model ?? "claude-sonnet-4-20250514",
      anthropicApiKey: params.secretKey ?? process.env.ANTHROPIC_API_KEY,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });
  }

  // TODO: Fazer tratamento com EITHER?
  async invoke(params: BaseMessage[]): Promise<BaseMessage> {
    try {
      return await this.llmServiceInstance.invoke(params);
    } catch (error) {
      throw new CriticalError(
        error as Error,
        `Critical Error while calling AnthropicLLMService`
      );
    }
  }
}
