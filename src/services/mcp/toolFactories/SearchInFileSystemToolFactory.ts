import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { ZodTypeAny } from "zod";
import { LinuxSearchInFileSystemTool, SearchInFileSystemTool, execPowerShellAsync } from "@services/mcp/servers/ArtifactExtractor/tools/SearchInFileSystemTool.js";

export abstract class SearchInFileSystemToolFactory<TSchema extends ZodTypeAny = any> {
  abstract createToolClass(): BasicTool<TSchema>;
}

export class PowerShellSearchInFileSystemToolFactory extends SearchInFileSystemToolFactory<any> {
  createToolClass(): BasicTool<any> {
    return new SearchInFileSystemTool(execPowerShellAsync);
  }
}

export class LinuxSearchInFileSystemToolFactory extends SearchInFileSystemToolFactory<any> {
  createToolClass(): BasicTool<any> {
    return new LinuxSearchInFileSystemTool();
  }
}