import {
  OpenAILLMService,
  IOpenAILLMServiceParams,
} from "@agents/common/llmServices/OpenAILLMService.js";
import { LLMServiceFactory } from "@domain/agents/common/LLMServiceFactory.js";

export class OpenAILLMServiceFactory extends LLMServiceFactory<
  OpenAILLMService,
  IOpenAILLMServiceParams
> {
  create(
    constructorParams?: IOpenAILLMServiceParams
  ): OpenAILLMService {
    return new OpenAILLMService(constructorParams);
  }
}
