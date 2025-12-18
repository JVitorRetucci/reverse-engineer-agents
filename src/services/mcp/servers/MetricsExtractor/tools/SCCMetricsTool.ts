import { MetricsTool } from "@domain/mcp/servers/Metrics/tools/MetricsTool.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import z from "zod";

const execAsync = promisify(exec);

const SccMetricsToolSchema = z.object({
  path: z.string().describe("Path to the target project's folder"),
  sccFlags: z
    .string()
    .nullable()
    .describe("Optional flags to gather more specific information"),
});

export class SCCMetricsTool extends MetricsTool<typeof SccMetricsToolSchema> {
  private customToolExecutor: (command: string) => Promise<{ stdout: string; stderr: string }>;
  
  constructor(customToolExecutor: (command: string) => Promise<{ stdout: string; stderr: string }> = execAsync) {
    super(
      "SCC_Metrics",
      `Used to discover the following software metrics for the project and for each file type: count, bytes, lines, code, comment, blank, complexity, weighted complexity.
      The response needs is formatted as a JSON array of objects, where each object contains the metrics for a file type.
      Example:
      [
       {
          "Name": "TypeScript",
          "Bytes": 8795,
          "CodeBytes": 0,
          "Lines": 307,
          "Code": 248,
          "Comment": 8,
          "Blank": 51,
          "Complexity": 11,
          "Count": 14,
          "WeightedComplexity": 0,
          "Files": []
        },
      ]`,
      SccMetricsToolSchema
    )
    this.customToolExecutor = customToolExecutor;
  }

  public async invoke({ path, sccFlags }: z.infer<typeof SccMetricsToolSchema>): Promise<CallToolResult> {
    try {
      console.log({lorem: this})
      // Invokes SCC program through Node's child_process
      const { stdout } = await this.customToolExecutor(`scc "${path}" ${sccFlags || ""} --format json`);
  
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
      console.error({error})
      const formattedErrorMessage = `Error while getting project static analysis: \n${error}`;
  
      // MCP Tool result format
      return {
        content: [
          {
            type: "text",
            text: formattedErrorMessage,
          },
        ],
        isError: true
      };
    }
  }
}