import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodTypeAny, z } from "zod";

export abstract class MetricsTool<TSchema extends ZodTypeAny> {
  public name: string;
  public description: string;
  public parametersSchema: TSchema;
  
  constructor(name: string, description: string, parametersSchema: TSchema) {
    this.name = name;
    this.description = description;
    this.parametersSchema = parametersSchema;
  }

  public abstract invoke(toolParameters: z.infer<TSchema>): CallToolResult;
}
