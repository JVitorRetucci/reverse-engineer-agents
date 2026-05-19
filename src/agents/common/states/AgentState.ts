import { BaseMessage } from "@langchain/core/messages";
import z from "zod";

export const AgentStateSchema = z.object({
  messages: z
    .array(z.custom<BaseMessage>()),
  iterationLevel: z.number().optional(),
  errors: z.array(z.string()).optional(),
  skillsPrompt: z.string().optional(),
  selectedSkillId: z.string().optional(),
  skillBodyLoaded: z.boolean().optional(),
  toolAttemptCounts: z.record(z.number()).optional(),
  blockedTools: z.array(z.object({ toolName: z.string(), args: z.string() })).optional(),
});

export type AgentState = z.infer<typeof AgentStateSchema>
