import {
  ILLMServiceParams,
  LLMService,
} from "@domain/agents/common/LLMService.js";
import { LLMServiceFactory } from "@domain/agents/common/LLMServiceFactory.js";
import {
  IOllamaLLMServiceParams,
  OllamaLLMService,
} from "../OllamaLLMService.js";
import {
  AnthropicLLMService,
  IAnthropicLLMServiceParams,
} from "../AnthropicLLMService.js";
import {
  GoogleLLMService,
  IGoogleLLMServiceParams,
} from "../GoogleLLMService.js";
import { join } from "path";
import { readFileSync } from "fs";
import { IOpenAILLMServiceParams, OpenAILLMService } from "../OpenAILLMService.js";
import { IOpenRouterLLMServiceParams, OpenRouterLLMService } from "../OpenRouterLLMService.js";

type DefaultLLMService =
  | OllamaLLMService
  | AnthropicLLMService
  | OpenAILLMService
  | OpenRouterLLMService
  | GoogleLLMService;
type IDefaultLLMServiceParams =
  | IOllamaLLMServiceParams
  | IAnthropicLLMServiceParams
  | IOpenAILLMServiceParams
  | IOpenRouterLLMServiceParams
  | IGoogleLLMServiceParams;

const availableLLMServices = {
  ollama: OllamaLLMService,
  anthropic: AnthropicLLMService,
  google: GoogleLLMService,
  openai: OpenAILLMService,
  open_router: OpenRouterLLMService,
} as const;

export class DefaultLLMServiceFactory extends LLMServiceFactory<
  DefaultLLMService,
  IDefaultLLMServiceParams
> {
  private defaultLLMService: "ollama" | "anthropic" | "google" | "openai" | "open_router";

  constructor(configPath: string = "agents.config.json") {
    super();

    const fullPath = join(process.cwd(), configPath);
    const configContent = readFileSync(fullPath, "utf-8");
    const config = JSON.parse(configContent);

    this.defaultLLMService = Object.keys(availableLLMServices).includes(
      config.default_llm_service,
    )
      ? config.default_llm_service
      : "ollama";
  }

  create(constructorParams?: IDefaultLLMServiceParams): DefaultLLMService {
    return new availableLLMServices[this.defaultLLMService](constructorParams);
  }
}
