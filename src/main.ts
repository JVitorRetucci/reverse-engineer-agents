import express from "express";
import { AgentCard, AgentSkill } from "@a2a-js/sdk";
import {
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
  DefaultRequestHandler,
  InMemoryTaskStore,
} from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import { GreetingAgentExecutor } from "agents/main/executor.js";

async function main() {
  const skill: AgentSkill = {
    id: "my_first_skill",
    name: "Greet",
    description: "Return a greeting",
    tags: ["greeting", "hello", "world"],
    examples: ["Hey", "Hello", "Hi"]
  }

  const agentCard: AgentCard = {
    name: "Greeting Agent",
    description: "A simple agent that returns a greeting",
    url: "http://localhost:4000",
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    skills: [skill],
    version: "1.0.0",
    capabilities: {},
    protocolVersion: ""
  }

  const agentExecutor = new GreetingAgentExecutor();
  const requestHandler = new DefaultRequestHandler(
    agentCard,
    new InMemoryTaskStore(),
    agentExecutor
  )
  
  const appBuilder = new A2AExpressApp(requestHandler);
  const expressApp = appBuilder.setupRoutes(express());

  expressApp.listen(4000, () => {
    console.log(`🚀 Server started on http://localhost:4000`)
  })
}

main().catch(err => console.error(err));
