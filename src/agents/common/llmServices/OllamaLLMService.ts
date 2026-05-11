import { CriticalError } from "@core/Errors/CriticalError.js";
import {
  ILLMServiceParams,
  LLMService,
} from "@domain/agents/common/LLMService.js";
import { ChatOllama } from "@langchain/ollama";
import { BaseMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { DynamicStructuredTool } from "@langchain/core/tools";

export interface IOllamaLLMServiceParams
  extends ILLMServiceParams<DynamicStructuredTool> {}

export class OllamaLLMService extends LLMService<
  BaseMessage[],
  BaseMessage
> {
  private llmServiceInstance: ChatOllama | Runnable<any, any>;

  constructor(params?: IOllamaLLMServiceParams) {
    super(params);

    const baseModel = new ChatOllama({
      model: params?.model ?? "gemma4:31b-cloud",
      // model: params?.model ?? "glm-5:cloud",
      temperature: params?.temperature,
      
    });

    let modelWithTools: ChatOllama | Runnable<unknown, unknown> = baseModel;

    if (params?.tools && params.tools.length > 0) {
      modelWithTools = baseModel.bindTools(params.tools);
    }

    this.llmServiceInstance = modelWithTools;
  }

  // TODO: Fazer tratamento com EITHER?
  async invoke(params: BaseMessage[]): Promise<BaseMessage> {
    try {
      const response = await this.llmServiceInstance.invoke(params as any);
      return response as BaseMessage;
    } catch (error) {
      throw new CriticalError(
        error as Error,
        `Critical Error while calling OllamaLLMService`
      );
    }
  }
}
