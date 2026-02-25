import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { ZodTypeAny } from "zod";
import { DirectoryNavigationTool } from "@services/mcp/servers/ArtifactExtractor/tools/DirectoryNavigationTool.js";

export abstract class DirectoryNavigationToolFactory<
  TSchema extends ZodTypeAny = any,
> {
  abstract createToolClass(): BasicTool<TSchema>;
}

export class PowerShellDirectoryNavigationToolFactory extends DirectoryNavigationToolFactory<any> {
  createToolClass(): BasicTool<any> {
    return new DirectoryNavigationTool();
  }
}
