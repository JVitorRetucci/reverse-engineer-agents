export interface ILLMServiceParams<T = unknown> {
  model?: string;
  secretKey?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: T[];
}

export abstract class LLMService<
  InvokeParamsType = unknown,
  InvokeResponseType = unknown
> {
  constructor(params?: ILLMServiceParams) {}

  // TODO: Fazer tratamento com EITHER?
  abstract invoke(params: InvokeParamsType): Promise<InvokeResponseType>;
}
