import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { ZodTypeAny } from "zod";
import { SyntaxValidatorTool } from "@services/mcp/servers/DiagramGenerationTools/tools/SyntaxValidatorTool.js";

export abstract class SyntaxValidatorToolFactory<TSchema extends ZodTypeAny = any> {
  abstract createToolClass(): BasicTool<TSchema>;
}

export class MermaidSyntaxValidatorToolFactory extends SyntaxValidatorToolFactory<any> {
  createToolClass(): BasicTool<any> {
    return new SyntaxValidatorTool();
  }
}
