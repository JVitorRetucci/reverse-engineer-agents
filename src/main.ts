import { AgentCard, AgentSkill } from "@a2a-js/sdk";
import { DefaultRequestHandler, InMemoryTaskStore } from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import { MetricsAgentExecutor } from "@agents/metrics/executor.js";
import { MainAgentExecutor } from "agents/main/executor.js";
import "dotenv/config";
import express from "express";

async function startMetricsAgent() {
  const skill: AgentSkill = {
    id: "software_metrics_extraction",
    name: "Uses SCC software in order to extract metrics from target software",
    description: "Help with raw metrics software data",
    tags: ["software metrics", "scc", "metrics extractor"],
    examples: ["I need metrics from software located at './'", "Give me data about the project located at './folder/extraction_project'"],
  };

  const agentCard: AgentCard = {
    name: "Metrics Primary Extractor Component",
    description: "Help with raw metrics software data",
    url: "http://localhost:4201",
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    skills: [skill],
    version: "1.0.0",
    capabilities: {},
    protocolVersion: "",
  };

  const agentExecutor = new MetricsAgentExecutor();
  const requestHandler = new DefaultRequestHandler(
    agentCard,
    new InMemoryTaskStore(),
    agentExecutor
  );

  const appBuilder = new A2AExpressApp(requestHandler);
  const expressApp = appBuilder.setupRoutes(express());

  const port = 4201;
  expressApp.listen(port, (a) => {
    console.log(`🚀 Server started on http://localhost:${port}`);
  });
}

async function main() {
  startMetricsAgent()
  
  const skill: AgentSkill = {
    id: "software_reverse_engineering",
    name: "Software reverse engineering tasks",
    description: "Help with complex and multi-step software reverse engineering tasks",
    tags: ["software reverse engineering", "software understanding", "software engineering"],
    // examples: ["Hey", "Hello", "Hi"],
  };

  const agentCard: AgentCard = {
    name: "Software Reverse Engineering Agent",
    description: "An agent capable of performing long and complex software reverse engineering tasks by delegating work to multiple other agents",
    url: "http://localhost:4000",
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    skills: [skill],
    version: "1.0.0",
    capabilities: {},
    protocolVersion: "",
  };

  const agentExecutor = new MainAgentExecutor();
  const requestHandler = new DefaultRequestHandler(
    agentCard,
    new InMemoryTaskStore(),
    agentExecutor
  );

  const appBuilder = new A2AExpressApp(requestHandler);
  const expressApp = appBuilder.setupRoutes(express());

  const port = 4000;
  expressApp.listen(port, (a) => {
    console.log(`🚀 Server started on http://localhost:${port}`);
  });
}

main()
  .catch((err) => console.error(err))
  .finally();
