import { BaseMessage, ToolMessage } from "@langchain/core/messages";
import { getRuntimeConfig } from "@core/RuntimeConfig.js";

const DEFAULT_MAX_TOOL_ERROR_ATTEMPTS =
  getRuntimeConfig().max_agent_tool_error_attempts;

function extractErrorText(message: ToolMessage): string | null {
  const content = message.content;

  if (typeof content !== "string") {
    return JSON.stringify(content);
  }

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;

    if (typeof parsed.error === "string") {
      return parsed.error;
    }

    if (typeof parsed.reason === "string") {
      return parsed.reason;
    }

    if (typeof parsed.message === "string") {
      return parsed.message;
    }

    if (typeof parsed.type === "string" && parsed.type.length > 0) {
      return parsed.type;
    }
  } catch {
    if (content.trim().length > 0) {
      return content;
    }
  }

  return null;
}

export function buildToolErrorLimitMessage(
  messages: BaseMessage[] | undefined,
): ToolMessage | null {
  if (!messages || messages.length === 0) {
    return null;
  }

  const recentErrors: string[] = [];

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const currentMessage = messages[index];

    if (!(currentMessage instanceof ToolMessage)) {
      break;
    }

    const errorText = extractErrorText(currentMessage);

    if (!errorText) {
      break;
    }

    recentErrors.push(errorText);

    if (recentErrors.length >= DEFAULT_MAX_TOOL_ERROR_ATTEMPTS) {
      const summary = {
        type: "tool_error_limit",
        reason: `Reached ${DEFAULT_MAX_TOOL_ERROR_ATTEMPTS} consecutive tool errors while trying to resolve the request.`,
        attempts: recentErrors.length,
        recentErrors: recentErrors.slice(0, 3).reverse(),
        note: "Returning a short report to the caller instead of retrying again.",
      };

      return new ToolMessage({
        tool_call_id: "tool_error_limit",
        content: JSON.stringify(summary),
      });
    }
  }

  return null;
}