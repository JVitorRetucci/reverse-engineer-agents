import { AgentCard, AgentSkill } from "@a2a-js/sdk";
import {
  AgentExecutor,
  DefaultRequestHandler,
  InMemoryTaskStore,
} from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import cors from "cors";
import express from "express";
import { Server } from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { applyRuntimeConfigToEnvironment, getRuntimeConfig } from "./RuntimeConfig.js";

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  port: number;
  executorPath: string;
  executorClass: string;
  skill: AgentSkill;
}

interface AgentsConfig {
  agents: AgentConfig[];
}

export class AgentRegistry {
  private config: AgentsConfig;
  private servers: Map<string, Server> = new Map();

  constructor(configPath: string = "agents.config.json") {
    const fullPath = join(process.cwd(), configPath);
    const configContent = readFileSync(fullPath, "utf-8");
    this.config = JSON.parse(configContent);
    applyRuntimeConfigToEnvironment(configPath);
  }

  async startAllAgents(): Promise<void> {
    const promises = this.config.agents.map((agentConfig) =>
      this.startAgent(agentConfig)
    );
    await Promise.all(promises);
  }

  private async startAgent(agentConfig: AgentConfig): Promise<void> {
    const executor = await this.loadExecutor(agentConfig);

    const skill: AgentSkill = agentConfig.skill;

    const agentCard: AgentCard = {
      name: agentConfig.name,
      description: agentConfig.description,
      url: `http://localhost:${agentConfig.port}`,
      defaultInputModes: ["text"],
      defaultOutputModes: ["text"],
      skills: [skill],
      version: "1.0.0",
      capabilities: {},
      protocolVersion: "",
    };

    const requestHandler = new DefaultRequestHandler(
      agentCard,
      new InMemoryTaskStore(),
      executor
    );

    const appBuilder = new A2AExpressApp(requestHandler);
    const expressApp = express();
    expressApp.use(this.createCorsMiddleware());
    appBuilder.setupRoutes(expressApp);

    const server = expressApp.listen(agentConfig.port, () => {
      console.log(
        `🚀 Agent '${agentConfig.id}' started on http://localhost:${agentConfig.port}`
      );
    });

    this.servers.set(agentConfig.id, server);
  }

  /** Prototype-friendly CORS; set CORS_ORIGIN to restrict (comma-separated origins). */
  private createCorsMiddleware() {
    const origins = getRuntimeConfig().cors_origin;
    if (origins.length > 0) {
      return cors({ origin: origins });
    }
    return cors();
  }

  private async loadExecutor(agentConfig: AgentConfig): Promise<AgentExecutor> {
    try {
      const module = await import(agentConfig.executorPath);
      const ExecutorClass = module[agentConfig.executorClass];

      if (!ExecutorClass) {
        throw new Error(
          `Executor class '${agentConfig.executorClass}' not found in ${agentConfig.executorPath}`
        );
      }

      return new ExecutorClass();
    } catch (error) {
      throw new Error(
        `Failed to load executor for agent '${agentConfig.id}': ${error}`
      );
    }
  }

  getAgentConfig(agentId: string): AgentConfig | undefined {
    return this.config.agents.find((agent) => agent.id === agentId);
  }

  getAllAgentConfigs(): AgentConfig[] {
    return this.config.agents;
  }

  async stopAgent(agentId: string): Promise<void> {
    const server = this.servers.get(agentId);
    if (server) {
      server.close();
      this.servers.delete(agentId);
      console.log(`⏹ Agent '${agentId}' stopped`);
    }
  }

  async stopAllAgents(): Promise<void> {
    const promises = Array.from(this.servers.keys()).map((agentId) =>
      this.stopAgent(agentId)
    );
    await Promise.all(promises);
  }
}
