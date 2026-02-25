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

const ListDirectoriesToolSchema = z.object({
  path: z
    .string()
    .nullable()
    .describe(
      "Path to target folder. If null, gets the current folder's info.",
    ),
  depth: z
    .number()
    .nullable()
    .optional()
    .describe(
      "Search depth to prevent recursive calls when analyzing directories. Warning: Use with caution since it can result in long responses.",
    ),
});

export class ListDirectoriesTool extends BasicTool<
  typeof ListDirectoriesToolSchema
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
      "PowerShell_Directory_Listing",
      `Used to discover files and other directories within the current or target path.
      The response is formatted as a JSON array of objects, where each object contains info for each item inside the directory.
      Example:
      [ 
        {
          "Name":  "GenericFolder",
          "PSIsContainer":  true
        },
        {
          "Name":  "GenericFile.txt",
          "PSIsContainer":  false
        },
      ]`,
      ListDirectoriesToolSchema,
    );
    this.customToolExecutor = customToolExecutor;
  }

  public async invoke({
    path,
    depth
  }: z.infer<typeof ListDirectoriesToolSchema>): Promise<CallToolResult> {
    try {
      // path null/undefined => current directory (per schema description)
      const targetPath = path ?? ".";
      // Must run in PowerShell (on Windows, exec() defaults to cmd.exe where `ls` doesn't exist)
      const { stdout } = await this.customToolExecutor(
        `Get-ChildItem -Path "${targetPath}" -Force ${!!depth ? `-Depth ${depth} ` : ""}| Select-Object Name, Extension, PSIsContainer, DirectoryName | ConvertTo-Json`
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
