import { MetricsTool } from "@domain/mcp/servers/Metrics/tools/MetricsTool.js";
import { ZodTypeAny } from "zod";
import { SCCMetricsTool } from "@services/mcp/servers/MetricsExtractor/tools/SCCMetricsTool.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export abstract class MetricsToolFactory<TSchema extends ZodTypeAny = any> {
  abstract createToolClass(): MetricsTool<TSchema>;
}

export class SCCMetricsToolFactory extends MetricsToolFactory<any> {
  createToolClass(): MetricsTool<any> {
    return new SCCMetricsTool(execAsync);
  }
}
