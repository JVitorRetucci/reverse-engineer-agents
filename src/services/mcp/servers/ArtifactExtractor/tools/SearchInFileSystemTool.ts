import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import z from "zod";

const execAsync = promisify(exec);

/** On Windows, exec() uses cmd.exe by default; this runs the command in PowerShell. Exported for use in tool factories. */
export function execPowerShellAsync(
  command: string,
): Promise<{ stdout: string; stderr: string }> {
  return execAsync(command, { shell: "powershell" });
}

const SearchInFileSystemToolSchema = z.object({
  path: z
    .string()
    .nullable()
    .describe(
      "Path to the folder where the search should start. If null, uses the current folder.",
    ),
  pattern: z
    .string()
    .describe(
      "Regular expression used to match file names. Example: Controller.*\\.java$",
    ),
});

export class SearchInFileSystemTool extends BasicTool<
  typeof SearchInFileSystemToolSchema
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
      "PowerShell_Search_In_File_System",
      `Used to search recursively for files whose names match a regular expression.
      The response is formatted as a JSON array of objects with the matching file name and directory path.
      Example input: { "path": "C:\\project", "pattern": "Controller.*\\.java$" }
      Example output:
      [
        {
          "Name": "UserController.java",
          "DirectoryName": "C:\\project\\src\\main\\java\\app\\controllers"
        }
      ]`,
      SearchInFileSystemToolSchema,
    );
    this.customToolExecutor = customToolExecutor;
  }

  public async invoke({
    path,
    pattern,
  }: z.infer<typeof SearchInFileSystemToolSchema>): Promise<CallToolResult> {
    try {
      const targetPath = path ?? ".";
      const escapedTargetPath = this.escapePowerShellSingleQuotedString(targetPath);
      const escapedPattern = this.escapePowerShellSingleQuotedString(pattern);
      const { stdout } = await this.customToolExecutor(
        `@(Get-ChildItem -Path '${escapedTargetPath}' -Recurse -File -Force | Where-Object { $_.Name -match '${escapedPattern}' } | Select-Object Name, DirectoryName) | ConvertTo-Json`
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
      const formattedErrorMessage = `Error while searching in file system: \n${error}`;

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

  private escapePowerShellSingleQuotedString(value: string) {
    return value.replace(/'/g, "''");
  }
}
