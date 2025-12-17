import { LLMServiceFactory } from "@domain/agents/common/LLMServiceFactory.js";
import {
  GoogleLLMService,
  IGoogleLLMServiceParams,
} from "@agents/common/llmServices/GoogleLLMService.js";

export class GoogleLLMServiceFactory extends LLMServiceFactory<
  GoogleLLMService,
  IGoogleLLMServiceParams
> {
  create(constructorParams?: IGoogleLLMServiceParams): GoogleLLMService {
    return new GoogleLLMService(constructorParams);
  }
}
