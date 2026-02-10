import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import z from "zod";

const execAsync = promisify(exec);

const DirectoryNavigationToolSchema = z.object({
  path: z
    .string()
    .describe(
      "Path to target folder. Use '..' to go back to parent directory.",
    ),
});

export class DirectoryNavigationTool  extends BasicTool<
  typeof DirectoryNavigationToolSchema
> {
  private customToolExecutor: (
    command: string,
  ) => Promise<{ stdout: string; stderr: string }>;

  constructor(
    customToolExecutor: (
      command: string,
    ) => Promise<{ stdout: string; stderr: string }> = execAsync,
  ) {
    super(
      "PowerShell_Directory_Navigation",
      `Used to navigate through other directories within the current or target path.
      The response should be empty if the command succeed.
      Use double periods (..) to go back to parent directory.`,
      DirectoryNavigationToolSchema,
    );
    this.customToolExecutor = customToolExecutor;
  }

  public async invoke({
    path,
  }: z.infer<typeof DirectoryNavigationToolSchema>): Promise<CallToolResult> {
    try {
      // Invokes `ls` command through Node's child_process. Current in the default OS terminal environment (Windows: PowerShell)
      await this.customToolExecutor(
        `cd "${path}"`
      );

      // MCP Tool result format
      return {
        content: [
          {
            type: "text",
            text: "",
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
