import { MetricsTool } from "@domain/mcp/servers/Metrics/tools/MetricsTool.js";
import { ZodTypeAny } from "zod";

export abstract class MetricsToolFactory<TSchema extends ZodTypeAny = any> {
  abstract createToolClass(): MetricsTool<TSchema>;
}

export class SCCMetricsToolFactory extends MetricsToolFactory<any> {

  createToolClass(): MetricsTool<any> {
    throw new Error("Method not implemented.");
  }
}
