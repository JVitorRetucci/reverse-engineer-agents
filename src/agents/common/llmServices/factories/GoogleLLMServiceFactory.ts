import { LLMServiceFactory } from "@domain/agents/common/LLMServiceFactory.js";
import { ILLMServiceParams } from "@domain/agents/common/LLMService.js";
import { GoogleLLMService } from "@agents/common/llmServices/GoogleLLMService.js"

export class GoogleLLMServiceFactory extends LLMServiceFactory<GoogleLLMService> {
  create(constructorParams: ILLMServiceParams = {}): GoogleLLMService {
    return new GoogleLLMService(constructorParams);
  }
}
