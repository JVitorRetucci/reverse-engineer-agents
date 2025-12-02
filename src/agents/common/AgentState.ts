import { BaseMessage } from "@langchain/core/messages";
import z from "zod";

export const AgentStateSchema = z.object({
  messages: z
    .array(z.custom<BaseMessage>()),
  iterationLevel: z.number().optional(),
  errors: z.array(z.string()).optional(),
});

export type AgentState = z.infer<typeof AgentStateSchema>
