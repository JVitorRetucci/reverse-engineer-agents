import { CriticalError } from "@core/Errors/CriticalError.js";
import {
  ILLMServiceParams,
  LLMService,
} from "@domain/agents/common/LLMService.js";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { DynamicStructuredTool } from "@langchain/core/tools";

export interface IOpenAILLMServiceParams
  extends ILLMServiceParams<DynamicStructuredTool> {}

export class OpenAILLMService extends LLMService<
  BaseMessage[],
  BaseMessage
> {
  private llmServiceInstance: ChatOpenAI | Runnable<any, any>;

  constructor(params?: IOpenAILLMServiceParams) {
    super(params);

    const baseModel = new ChatOpenAI({
      model: params?.model ?? "gpt-5.3-codex",
      apiKey: params?.secretKey ?? process.env.OPENAI_API_KEY,
      temperature: params?.temperature,
      maxTokens: params?.maxTokens,
    });

    let modelWithTools: ChatOpenAI | Runnable<unknown, unknown> = baseModel;

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
        `Critical Error while calling OpenAILLMService`
      );
    }
  }
}
