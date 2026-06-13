import { AIMessage, BaseMessage, HumanMessage, coerceMessageLikeToMessage } from "@langchain/core/messages";
import { CriticalError } from "@core/Errors/CriticalError.js";

export function normalizeLLMResponse(input: unknown): BaseMessage {
  try {
    if (typeof input === "string") {
      return new AIMessage(input);
    }

    if (input && typeof (input as any)._getType === "function") {
      return input as BaseMessage;
    }

    const normalized = coerceMessageLikeToMessage(input as any);

    if (normalized instanceof HumanMessage && typeof input === "string") {
      return new AIMessage(normalized.content as string);
    }

    if (!normalized || typeof (normalized as any)._getType !== "function") {
      throw new Error("Unable to normalize LLM response to BaseMessage");
    }

    return normalized as BaseMessage;
  } catch (error) {
    throw new CriticalError(
      error instanceof Error ? error : new Error(String(error)),
      "Failed to normalize LLM response to BaseMessage",
    );
  }
}
