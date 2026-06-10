import { BaseMessage } from "@langchain/core/messages";
import z from "zod";

export const AgentStateSchema = z.object({
  messages: z
    .array(z.custom<BaseMessage>()),
  iterationLevel: z.number().optional(),
  errors: z.array(z.string()).optional(),
  // novos campos opcionais para persistência
  contextId: z.string().optional(),
  systemPromptVersion: z.string().optional(),
  storedCursor: z.number().optional(),
});

export type AgentState = z.infer<typeof AgentStateSchema>
