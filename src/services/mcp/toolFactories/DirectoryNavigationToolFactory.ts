import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { ZodTypeAny } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import { DirectoryNavigationTool } from "@services/mcp/servers/ArtifactExtractor/tools/DirectoryNavigationTool.js";

const execAsync = promisify(exec);

export abstract class DirectoryNavigationToolFactory<TSchema extends ZodTypeAny = any> {
  abstract createToolClass(): BasicTool<TSchema>;
}

export class PowerShellDirectoryNavigationToolFactory extends DirectoryNavigationToolFactory<any> {
  createToolClass(): BasicTool<any> {
    return new DirectoryNavigationTool(execAsync);
  }
}
