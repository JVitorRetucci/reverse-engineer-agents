import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";
import z from "zod";

const execAsync = promisify(exec);

/** On Windows, exec() uses cmd.exe by default; this runs the command in PowerShell. Exported for use in tool factories. */
export function execPowerShellAsync(
  command: string,
): Promise<{ stdout: string; stderr: string }> {
  return execAsync(command, { shell: "powershell" });
}

const GetFileContentToolSchema = z.object({
  /**
   * Target file path you want to read.
   *
   * - Can be an absolute path (e.g. "C:\\Projects\\App\\Main.java")
   * - Can be relative to `currentPath` (e.g. "index.ts", "../Main.java", "src\\components.cpp")
   */
  path: z
    .string()
    .describe(
      "Target file path and extension. Can be absolute or relative (e.g. '../index.ts', 'file.txt').",
    ),
});

/*
  TODO: Can be improved by using embedding and returning results divided in chunks.
*/
export class GetFileContentTool extends BasicTool<
  typeof GetFileContentToolSchema
> {
  private customToolExecutor: (
    command: string,
  ) => Promise<{ stdout: string; stderr: string }>;

  constructor(
    customToolExecutor: (
      command: string,
    ) => Promise<{ stdout: string; stderr: string }> = execPowerShellAsync,
  ) {
    super(
      "PowerShell_Get_File_Content",
      `Reads file content using PowerShell's Get-Content. Accepts absolute or relative paths (relative to currentPath) and returns the text in MCP tool result format. Runs in PowerShell for Windows compatibility. 
      Examples: { path: "C:\\Projects\\App\\Main.java" } (absolute), { path: "src/index.ts" } (relative), { path: "." } (current directory).`,
      GetFileContentToolSchema,
    );
    this.customToolExecutor = customToolExecutor;
  }

  public async invoke({
    path,
  }: z.infer<typeof GetFileContentToolSchema>): Promise<CallToolResult> {
    try {
      // Must run in PowerShell (on Windows, exec() defaults to cmd.exe where `ls` doesn't exist)
      const { stdout } = await this.customToolExecutor(
        `Get-Content -Path "${path}"`,
      );

      // MCP Tool result format
      return {
        content: [
          {
            type: "text",
            text: stdout,
          },
        ],
      };
    } catch (error) {
      const formattedErrorMessage = `Error while getting project static analysis: \n${error}`;

      // MCP Tool result format
      return {
        content: [
          {
            type: "text",
            text: formattedErrorMessage,
          },
        ],
        isError: true,
      };
    }
  }
}

export class LinuxGetFileContentTool extends BasicTool<
  typeof GetFileContentToolSchema
> {
  constructor() {
    super(
      "Linux_Get_File_Content",
      `Reads file content from a Linux/POSIX filesystem using Node.js UTF-8 file access. Accepts absolute or relative Linux paths.`,
      GetFileContentToolSchema,
    );
  }

  public async invoke({
    path: filePath,
  }: z.infer<typeof GetFileContentToolSchema>): Promise<CallToolResult> {
    try {
      const content = await fs.readFile(filePath, "utf8");
      return {
        content: [{ type: "text", text: content }],
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error while getting Linux file content: ${reason}`,
        }],
        isError: true,
      };
    }
  }
}
