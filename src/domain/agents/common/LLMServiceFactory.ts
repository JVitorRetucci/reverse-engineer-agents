import { ILLMServiceParams, LLMService } from "./LLMService.js";

export abstract class LLMServiceFactory<
  T extends LLMService<unknown, unknown>
> {
  abstract create(constructorParams: ILLMServiceParams): T;
}
