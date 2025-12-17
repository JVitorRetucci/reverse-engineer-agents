import {
  ILLMServiceParams,
  LLMService,
} from "@domain/agents/common/LLMService.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseMessage } from "@langchain/core/messages";
import { CriticalError } from "@root/core/Errors/CriticalError.js";
import { DynamicStructuredTool, Tool } from "@langchain/core/tools";
import { Runnable } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";

export interface IGoogleLLMServiceParams
  extends ILLMServiceParams<DynamicStructuredTool> {}

export class GoogleLLMService extends LLMService<BaseMessage[], BaseMessage> {
  private llmServiceInstance: ChatGoogleGenerativeAI | Runnable<any, any>;

  constructor(params?: IGoogleLLMServiceParams) {
    super(params);

    const baseModel = (this.llmServiceInstance = new ChatGoogleGenerativeAI({
      model: params?.model ?? "gemini-2.5-flash",
      apiKey: params?.secretKey ?? process.env.GOOGLE_GEN_AI_API_KEY,
      temperature: params?.temperature,
      maxOutputTokens: params?.maxTokens,
    }));

    let modelWithTools: ChatAnthropic | Runnable<unknown, unknown> = baseModel;

    if (params?.tools && params.tools.length > 0)
      modelWithTools = baseModel.bindTools(params.tools);

    this.llmServiceInstance = modelWithTools;
  }

  // TODO: Fazer tratamento com EITHER?
  async invoke(params: BaseMessage[]): Promise<BaseMessage> {
    try {
      return await this.llmServiceInstance.invoke(params);
    } catch (error) {
      throw new CriticalError(
        error as Error,
        `Critical Error while calling GoogleLLMService`
      );
    }
  }
}
