export interface ILLMServiceParams {
  model?: string;
  secretKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export abstract class LLMService<InvokeParamsType = unknown, InvokeResponseType = unknown> {
  constructor(params: ILLMServiceParams) {}

  // TODO: Fazer tratamento com EITHER?
  abstract invoke(params: InvokeParamsType): Promise<InvokeResponseType>;
}