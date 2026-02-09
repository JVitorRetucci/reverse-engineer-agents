import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { ZodTypeAny } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import { ListDirectoriesTool } from "@services/mcp/servers/ArtifactExtractor/tools/ListDirectoriesTool.js";

const execAsync = promisify(exec);

export abstract class ListDirectoriesToolFactory<TSchema extends ZodTypeAny = any> {
  abstract createToolClass(): BasicTool<TSchema>;
}

export class PowerShellListDirectoriesToolFactory extends ListDirectoriesToolFactory<any> {
  createToolClass(): BasicTool<any> {
    return new ListDirectoriesTool(execAsync);
  }
}
