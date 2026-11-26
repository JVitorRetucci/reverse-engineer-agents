import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { ZodTypeAny } from "zod";
import { SCCMetricsTool } from "@services/mcp/servers/MetricsExtractor/tools/SCCMetricsTool.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export abstract class MetricsToolFactory<TSchema extends ZodTypeAny = any> {
  abstract createToolClass(): BasicTool<TSchema>;
}

export class SCCMetricsToolFactory extends MetricsToolFactory<any> {
  createToolClass(): BasicTool<any> {
    return new SCCMetricsTool(execAsync);
  }
}
