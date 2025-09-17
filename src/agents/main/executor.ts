import { Message } from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";
import { AgentExecutor, ExecutionEventBus, RequestContext } from "@a2a-js/sdk/server";

export class GreetingAgentExecutor implements AgentExecutor {
  constructor() {

  }
  
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    // Create a direct message response.
    const responseMessage: Message = {
      kind: "message",
      messageId: uuidv4(),
      role: "agent",
      parts: [{ kind: "text", text: "Hello, world!" }],
      // Associate the response with the incoming request's context.
      contextId: requestContext.contextId,
    };

    console.log(`Received message from: ${requestContext.userMessage.role}`)
    console.log(`Message:\n`)
    console.log({userMessage: requestContext, msgs: requestContext.userMessage.parts.map(a => console.log({a}))})
    console.log(`Responded:\n`)
    console.log(responseMessage)

    // Publish the message and signal that the interaction is finished.
    eventBus.publish(responseMessage);
    eventBus.finished();
  }

  async cancelTask(taskId: string, eventBus: ExecutionEventBus): Promise<void> {}

}