import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import z from "zod";

// Initialize mermaid for validation
const SyntaxValidatorToolSchema = z.object({
  generatedDiagram: z
    .string()
    .describe(
      "Generated diagram using mermaid syntax to be validated",
    ),
});

export class SyntaxValidatorTool extends BasicTool<
  typeof SyntaxValidatorToolSchema
> {
  constructor() {
    super(
      "Mermaid_syntax_validator_tool",
      `Used to validate the syntax of a Mermaid diagram.
      
      This tool checks whether a provided Mermaid diagram string is syntactically valid.
      It does not modify the diagram or persist any state. Instead, it returns either
      a success confirmation or a list of syntax errors.
      
      Usage guidelines for agents:
      - Always call this tool BEFORE returning a generated Mermaid diagram to the user.
      - Pass the complete Mermaid diagram string (including the diagram language declaration).
      - If the tool reports validation errors, iterate on the diagram and re-validate until it passes.
      - Do NOT include validation results in the final user-facing response.
      
      Example 1 (valid diagram):
      - Input:
        {
          "generatedDiagram": "graph TD\\n  A[Start] --> B[End]"
        }
      - Output:
        "OK" or success message
      
      Example 2 (invalid diagram with syntax error):
      - Input:
        {
          "generatedDiagram": "graph TD\\n  A[Start] --> B[End"
        }
      - Output:
        Error details describing the syntax issue
      `,
      SyntaxValidatorToolSchema,
    );
  }

  public async invoke({
    generatedDiagram,
  }: z.infer<typeof SyntaxValidatorToolSchema>): Promise<CallToolResult> {
    try {
      const validation = await this.validateMermaid(generatedDiagram);

      if (validation.valid) {
        return {
          content: [
            {
              type: "text",
              text: "OK",
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Mermaid syntax validation failed: ${validation.error}`,
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      const formattedErrorMessage = `Mermaid validation error: ${
        error instanceof Error ? error.message : String(error)
      }`;

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

  

private async validateMermaid(code: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  const tmpFile = path.join(os.tmpdir(), `diagram-${Date.now()}.mmd`);
  const tmpOut = path.join(os.tmpdir(), `diagram-out-${Date.now()}.png`);
  await fs.writeFile(tmpFile, code);

  return new Promise((resolve) => {
    exec(
      `npx mmdc -i "${tmpFile}" -o "${tmpOut}"`,
      (error, stdout, stderr) => {
        // Ensure we attempt to remove both temporary files regardless of outcome
        fs.rm(tmpFile, { force: true }).catch(() => {});
        fs.rm(tmpOut, { force: true }).catch(() => {});

        if (error) {
          resolve({
            valid: false,
            error: stderr || error.message,
          });
        } else {
          resolve({ valid: true });
        }
      }
    );
  });
}
}
