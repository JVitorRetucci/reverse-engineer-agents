import { ILLMServiceParams, LLMService } from "./LLMService.js";

export abstract class LLMServiceFactory<
  T extends LLMService,
  U extends ILLMServiceParams<unknown>
> {
  abstract create(constructorParams?: U): T;
}
