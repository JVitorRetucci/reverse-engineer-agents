import {
  OpenRouterLLMService,
  IOpenRouterLLMServiceParams,
} from "@agents/common/llmServices/OpenRouterLLMService.js";
import { LLMServiceFactory } from "@domain/agents/common/LLMServiceFactory.js";

export class OpenRouterLLMServiceFactory extends LLMServiceFactory<
  OpenRouterLLMService,
  IOpenRouterLLMServiceParams
> {
  create(
    constructorParams?: IOpenRouterLLMServiceParams
  ): OpenRouterLLMService {
    return new OpenRouterLLMService(constructorParams);
  }
}
