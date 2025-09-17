import { A2AClient } from "@a2a-js/sdk/client";
import { Message, MessageSendParams } from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";

async function run() {
  // Create a client pointing to the agent's Agent Card URL.
  const client = await A2AClient.fromCardUrl("http://localhost:4000/.well-known/agent-card.json");

  const sendParams: MessageSendParams = {
    message: {
      messageId: uuidv4(),
      role: "user",
      parts: [{ kind: "text", text: "Hi there!" }],
      kind: "message",
    },
  };

  console.log({props: sendParams.message})

  const response = await client.sendMessage(sendParams);

  if ("error" in response) {
    console.error("Error:", response.error.message);
  } else {
    const result = response.result as Message;
    const textResult = "text" in result.parts[0] ? result.parts[0].text : ""
    console.log("Agent response:", textResult); // "Hello, world!"
  }
}

await run();