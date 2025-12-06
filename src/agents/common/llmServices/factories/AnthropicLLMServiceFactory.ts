import { LLMServiceFactory } from "@domain/agents/common/LLMServiceFactory.js";
import { ILLMServiceParams } from "@domain/agents/common/LLMService.js";
import { AnthropicLLMService } from "@agents/common/llmServices/AnthropicLLMService.js"

export class AnthropicLLMServiceFactory extends LLMServiceFactory<AnthropicLLMService> {
  create(constructorParams: ILLMServiceParams = {}): AnthropicLLMService {
    return new AnthropicLLMService(constructorParams);
  }
}
