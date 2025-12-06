import {
  ILLMServiceParams,
  LLMService,
} from "@domain/agents/common/LLMService.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseMessage } from "@langchain/core/messages";
import { CriticalError } from "@root/core/Errors/CriticalError.js";

export class GoogleLLMService extends LLMService<
  BaseMessage[],
  BaseMessage
> {
  private llmServiceInstance: ChatGoogleGenerativeAI;

  constructor(params: ILLMServiceParams = {}) {
    super(params);

    this.llmServiceInstance = new ChatGoogleGenerativeAI({
      model: params.model ?? "gemini-2.5-flash",
      apiKey: params.secretKey ?? process.env.GOOGLE_GEN_AI_API_KEY,
      temperature: params.temperature,
      maxOutputTokens: params.maxTokens,
    });
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
