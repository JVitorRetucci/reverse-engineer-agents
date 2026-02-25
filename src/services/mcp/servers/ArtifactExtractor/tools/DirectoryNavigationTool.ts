import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import z from "zod";

const DirectoryNavigationToolSchema = z.object({
  /**
   * Target folder path you want to navigate to.
   *
   * - Can be an absolute path (e.g. "C:\\Projects\\App")
   * - Can be relative to `currentPath` (e.g. "src", "..", "src\\components")
   */
  path: z
    .string()
    .describe(
      "Target folder path. Can be absolute or relative (e.g. '..', 'subfolder').",
    ),
  /**
   * Current path from which `path` will be resolved.
   *
   * - If omitted or null, the server will use the MCP process working directory.
   * - Agents should always reuse the last value returned by this tool as `currentPath`
   *   to simulate continuous navigation.
   */
  currentPath: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Current folder path used as base to resolve the target path. If null/omitted, uses the MCP server working directory.",
    ),
});

export class DirectoryNavigationTool extends BasicTool<
  typeof DirectoryNavigationToolSchema
> {
  constructor() {
    super(
      "PowerShell_Directory_Navigation",
      `Used to calculate the next directory path based on a current path and a target path.
      
      This tool does NOT change any real terminal/session state. Instead, it returns the
      resolved absolute path that SHOULD be used in subsequent tool calls (like directory listing).
      
      Usage guidelines for agents:
      - Always keep track of the last directory path returned by this tool.
      - Pass that value back as "currentPath" on the next call.
      - Use "path" for the navigation intent:
        - ".." to go up one level
        - "subfolder" to go into a child folder
        - An absolute path to jump directly to a specific location
      
      Example 1 (go into a subfolder):
      - Input:
        {
          "currentPath": "C:\\Projects\\MyApp",
          "path": "src"
        }
      - Output (text):
        "C:\\Projects\\MyApp\\src"
      
      Example 2 (go back to parent directory):
      - Input:
        {
          "currentPath": "C:\\Projects\\MyApp\\src",
          "path": ".."
        }
      - Output (text):
        "C:\\Projects\\MyApp"
      
      Example 3 (jump to an absolute path):
      - Input:
        {
          "currentPath": "C:\\Projects\\MyApp\\src",
          "path": "D:\\Workspace"
        }
      - Output (text):
        "D:\\Workspace"
      `,
      DirectoryNavigationToolSchema,
    );
  }

  public async invoke({
    path: targetPath,
    currentPath,
  }: z.infer<typeof DirectoryNavigationToolSchema>): Promise<CallToolResult> {
    try {
      const basePath = currentPath ?? process.cwd();

      const resolvedPath = path.isAbsolute(targetPath)
        ? path.normalize(targetPath)
        : path.resolve(basePath, targetPath);

      return {
        content: [
          {
            type: "text",
            text: resolvedPath,
          },
        ],
      };
    } catch (error) {
      const formattedErrorMessage = `Error while resolving directory navigation path: \n${error}`;

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
