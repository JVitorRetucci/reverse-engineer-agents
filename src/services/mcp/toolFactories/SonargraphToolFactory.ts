import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { ZodTypeAny } from "zod";
import {
  SonargraphBuildTool,
  execPowerShellAsync,
} from "@services/mcp/servers/MetricsExtractor/tools/SonargraphBuildTool.js";

export abstract class SonargraphBuildToolFactory<TSchema extends ZodTypeAny = any> {
  abstract createToolClass(): BasicTool<TSchema>;
}

export class PowerShellSonargraphBuildToolFactory extends SonargraphBuildToolFactory<any> {
  createToolClass(): BasicTool<any> {
    return new SonargraphBuildTool(execPowerShellAsync);
  }
}
