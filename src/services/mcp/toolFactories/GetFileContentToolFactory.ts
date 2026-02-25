import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { ZodTypeAny } from "zod";
import { GetFileContentTool, execPowerShellAsync } from "@services/mcp/servers/ArtifactExtractor/tools/GetFileContentTool.js";

export abstract class GetFileContentToolFactory<TSchema extends ZodTypeAny = any> {
  abstract createToolClass(): BasicTool<TSchema>;
}

export class PowerShellGetFileContentToolFactory extends GetFileContentToolFactory<any> {
  createToolClass(): BasicTool<any> {
    return new GetFileContentTool(execPowerShellAsync);
  }
}
