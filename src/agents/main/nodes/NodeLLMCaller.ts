import {
  SystemMessage
} from "@langchain/core/messages";
import { AgentStateSchema } from "agents/common/AgentState.js";
import { Node } from "agents/common/Node.js";
import z from "zod";

export class NodeLLMCaller extends Node<z.infer<typeof AgentStateSchema>> {
  public async execute(
    state: z.infer<typeof AgentStateSchema>
  ): Promise<z.infer<typeof AgentStateSchema>> {
    console.log("Adding message to the list...\n");

    return {
      messages: [
        new SystemMessage(
          `Sample message number ${state.iterationLevel ?? 0}`
        ),
        ...state.messages ? state.messages : [],
      ],
    };
  }
}
