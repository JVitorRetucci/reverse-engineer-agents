import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { ZodTypeAny } from "zod";
import { ListDirectoriesTool, execPowerShellAsync } from "@services/mcp/servers/ArtifactExtractor/tools/ListDirectoriesTool.js";

export abstract class ListDirectoriesToolFactory<TSchema extends ZodTypeAny = any> {
  abstract createToolClass(): BasicTool<TSchema>;
}

export class PowerShellListDirectoriesToolFactory extends ListDirectoriesToolFactory<any> {
  createToolClass(): BasicTool<any> {
    return new ListDirectoriesTool(execPowerShellAsync);
  }
}
