import { readFileSync } from "fs";
import { join } from "path";

export interface RuntimeConfig {
  cors_origin: string[];
  frontend_origin: string;
  host_projects_path: string;
  host_projects_mount_source: string;
  debug_mode: boolean;
  debug_graph_path: string;
  max_agent_iterations: number;
  max_agent_tool_error_attempts: number;
  conversation_store_path: string;
  conversation_window: number;
  langsmith: {
    tracing: boolean;
    endpoint: string;
    tracing_v2: boolean;
    project: string;
  };
  mcp_servers: {
    metrics_extractor_path: string;
    artifact_extractor_path: string;
    diagram_tools_path: string;
  };
}

const defaults: RuntimeConfig = {
  cors_origin: [],
  frontend_origin: "http://localhost:3000",
  host_projects_path: "/workspace/projects",
  host_projects_mount_source: "..",
  debug_mode: false,
  debug_graph_path: "",
  max_agent_iterations: 50,
  max_agent_tool_error_attempts: 5,
  conversation_store_path: "data/conversations",
  conversation_window: 20,
  langsmith: {
    tracing: false,
    endpoint: "",
    tracing_v2: false,
    project: "",
  },
  mcp_servers: {
    metrics_extractor_path: "./",
    artifact_extractor_path: "./",
    diagram_tools_path: "./",
  },
};

let runtimeConfig: RuntimeConfig | undefined;

export function getRuntimeConfig(configPath: string = "agents.config.json"): RuntimeConfig {
  if (runtimeConfig) {
    return runtimeConfig;
  }

  const fullPath = join(process.cwd(), configPath);
  const parsed = JSON.parse(readFileSync(fullPath, "utf-8")) as {
    runtime?: Partial<RuntimeConfig>;
  };
  const runtime = parsed.runtime;

  runtimeConfig = {
    ...defaults,
    ...runtime,
    langsmith: { ...defaults.langsmith, ...runtime?.langsmith },
    mcp_servers: { ...defaults.mcp_servers, ...runtime?.mcp_servers },
  };

  return runtimeConfig;
}

export function applyRuntimeConfigToEnvironment(configPath: string = "agents.config.json"): void {
  const runtime = getRuntimeConfig(configPath);
  process.env.LANGSMITH_TRACING = String(runtime.langsmith.tracing);
  process.env.LANGSMITH_TRACING_V2 = String(runtime.langsmith.tracing_v2);
  process.env.LANGSMITH_ENDPOINT = runtime.langsmith.endpoint;
  process.env.LANGSMITH_PROJECT = runtime.langsmith.project;
}
