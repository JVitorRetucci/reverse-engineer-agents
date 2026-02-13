import {
  OllamaLLMService,
  IOllamaLLMServiceParams,
} from "@agents/common/llmServices/OllamaLLMService.js";
import { LLMServiceFactory } from "@domain/agents/common/LLMServiceFactory.js";

export class OllamaLLMServiceFactory extends LLMServiceFactory<
  OllamaLLMService,
  IOllamaLLMServiceParams
> {
  create(
    constructorParams?: IOllamaLLMServiceParams
  ): OllamaLLMService {
    return new OllamaLLMService(constructorParams);
  }
}
