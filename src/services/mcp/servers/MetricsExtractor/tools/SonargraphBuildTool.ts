import { BasicTool } from "@domain/mcp/servers/tools/BasicTool.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import z from "zod";

const execAsync = promisify(exec);

/** Runs a command in PowerShell. Exported for use in tool factories and tests. */
export function execPowerShellAsync(
  command: string,
): Promise<{ stdout: string; stderr: string }> {
  return execAsync(command, { shell: "powershell" });
}

const SonargraphBuildToolSchema = z.object({
  systemPath: z
    .string()
    .describe(
      "Absolute path to the Sonargraph system file (.sonargraph extension), e.g. 'C:\\Projects\\MyApp\\MyApp.sonargraph'.",
    ),
  reportPath: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Optional absolute path where the generated report file should be saved, e.g. 'C:\\Reports\\sonargraph-report.xml'.",
    ),
  reportType: z
    .enum(["xml", "html", "delta"])
    .nullable()
    .optional()
    .describe(
      "Optional report type to generate: 'xml' (default), 'html', or 'delta'. Requires reportPath to be set.",
    ),
});

export class SonargraphBuildTool extends BasicTool<
  typeof SonargraphBuildToolSchema
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
      "Sonargraph_Build",
      `Invokes the SonargraphBuild command-line tool via PowerShell to run a full software analysis on a Sonargraph system file.

      Prerequisites:
      - SONARGRAPH_INSTALLATION_PATH environment variable must point to the SonargraphBuild installation directory (e.g. 'C:\\Program Files\\hello2morrow\\SonargraphBuild').
      - SONARGRAPH_LICENSE_CODE environment variable must contain a valid Sonargraph activation/license code.

      The tool runs the analysis on the provided .sonargraph system file and optionally generates a report.
      On success, it returns the standard output from SonargraphBuild containing analysis results and metrics.

      Examples:
      - Basic analysis: { "systemPath": "C:\\Projects\\MyApp\\MyApp.sonargraph" }
      - Analysis with XML report: { "systemPath": "C:\\Projects\\MyApp\\MyApp.sonargraph", "reportPath": "C:\\Reports\\report.xml", "reportType": "xml" }
      - Analysis with HTML report: { "systemPath": "C:\\Projects\\MyApp\\MyApp.sonargraph", "reportPath": "C:\\Reports\\report.html", "reportType": "html" }`,
      SonargraphBuildToolSchema,
    );
    this.customToolExecutor = customToolExecutor;
  }

  public async invoke({
    systemPath,
    reportPath,
    reportType,
  }: z.infer<typeof SonargraphBuildToolSchema>): Promise<CallToolResult> {
    try {
      const installationPath = process.env.SONARGRAPH_INSTALLATION_PATH;
      const licenseCode = process.env.SONARGRAPH_LICENSE_CODE;

      if (!installationPath) {
        return {
          content: [
            {
              type: "text",
              text: "Error: SONARGRAPH_INSTALLATION_PATH environment variable is not set. Please configure it to point to the SonargraphBuild installation directory.",
            },
          ],
          isError: true,
        };
      }

      if (!licenseCode) {
        return {
          content: [
            {
              type: "text",
              text: "Error: SONARGRAPH_LICENSE_CODE environment variable is not set. Please provide a valid Sonargraph activation/license code.",
            },
          ],
          isError: true,
        };
      }

      const sonargraphBuildExecutable = `"${installationPath}\\bin\\SonargraphBuild.bat"`;

      let command = `& ${sonargraphBuildExecutable} -activationCode "${licenseCode}" -system "${systemPath}"`;

      if (reportPath) {
        command += ` -report "${reportPath}"`;
        if (reportType) {
          command += ` -reportType ${reportType}`;
        }
      }

      const { stdout, stderr } = await this.customToolExecutor(command);

      const output = stdout !== "" ? stdout : stderr;

      return {
        content: [
          {
            type: "text",
            text: output,
          },
        ],
      };
    } catch (error) {
      const formattedErrorMessage = `Error while running Sonargraph analysis: \n${error}`;

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
