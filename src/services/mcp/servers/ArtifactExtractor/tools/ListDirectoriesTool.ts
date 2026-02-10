import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import z from "zod";

const execAsync = promisify(exec);

const ListDirectoriesToolSchema = z.object({
  path: z
    .string()
    .nullable()
    .describe(
      "Path to target folder. If null, gets the current folder's info.",
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
    ) => Promise<{ stdout: string; stderr: string }> = execAsync,
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
  }: z.infer<typeof ListDirectoriesToolSchema>): Promise<CallToolResult> {
    try {
      // Invokes `ls` command through Node's child_process. Current in the default OS terminal environment (Windows: PowerShell)
      const { stdout } = await this.customToolExecutor(
        `ls "${path}" -Force | select Name, Extension, PSIsContainer | convertto-json`
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
