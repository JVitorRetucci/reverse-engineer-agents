import { LLMServiceFactory } from "@domain/agents/common/LLMServiceFactory.js";
import {
  AnthropicLLMService,
  IAnthropicLLMServiceParams,
} from "@agents/common/llmServices/AnthropicLLMService.js";

export class AnthropicLLMServiceFactory extends LLMServiceFactory<
  AnthropicLLMService,
  IAnthropicLLMServiceParams
> {
  create(
    constructorParams?: IAnthropicLLMServiceParams
  ): AnthropicLLMService {
    return new AnthropicLLMService(constructorParams);
  }
}
