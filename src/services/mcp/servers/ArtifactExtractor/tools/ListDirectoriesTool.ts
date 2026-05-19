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
      const { stdout, stderr } = await this.customToolExecutor(
        `Get-ChildItem -Path "${targetPath}" -Force ${!!depth ? `-Depth ${depth} ` : ""}| Select-Object Name, Extension, PSIsContainer, DirectoryName | ConvertTo-Json`
      );

      // Check if stderr contains errors (PowerShell may write errors but not throw)
      if (stderr && stderr.trim()) {
        const errorMessage = `PowerShell error while listing directory "${targetPath}": ${stderr}`;
        console.error(`[ListDirectoriesTool] ${errorMessage}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                errorType: "DIRECTORY_LISTING_ERROR",
                path: targetPath,
                reason: stderr,
              }),
            },
          ],
          isError: true,
        };
      }

      // Check if stdout is empty (path may not exist or no items)
      if (!stdout || stdout.trim() === "") {
        const infoMessage = `Directory "${targetPath}" is empty or does not exist.`;
        console.warn(`[ListDirectoriesTool] ${infoMessage}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                errorType: "DIRECTORY_NOT_FOUND_OR_EMPTY",
                path: targetPath,
                reason: "Directory does not exist, is not accessible, or is empty.",
              }),
            },
          ],
          isError: true,
        };
      }

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
      console.error(`[ListDirectoriesTool] ${formattedErrorMessage}`);

      // MCP Tool result format
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              errorType: "DIRECTORY_LISTING_EXECUTION_ERROR",
              reason: String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  }
}
