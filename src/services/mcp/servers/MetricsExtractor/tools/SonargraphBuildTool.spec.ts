import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SonargraphBuildTool } from './SonargraphBuildTool.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const MOCK_INSTALLATION_PATH = 'C:\\Program Files\\hello2morrow\\SonargraphBuild';
const MOCK_LICENSE_CODE = 'MOCK-LICENSE-1234-ABCD';

describe('SonargraphBuildTool', () => {
  let mockExecutor: ReturnType<typeof vi.fn>;
  let tool: SonargraphBuildTool;

  beforeEach(() => {
    mockExecutor = vi.fn();
    tool = new SonargraphBuildTool(mockExecutor);

    vi.stubEnv('SONARGRAPH_INSTALLATION_PATH', MOCK_INSTALLATION_PATH);
    vi.stubEnv('SONARGRAPH_LICENSE_CODE', MOCK_LICENSE_CODE);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Constructor', () => {
    it('should initialize with custom executor', () => {
      const customExecutor = vi.fn();
      const customTool = new SonargraphBuildTool(customExecutor);

      expect(customTool).toBeInstanceOf(SonargraphBuildTool);
      expect(customTool.name).toBe('Sonargraph_Build');
      expect(customTool.description).toContain('SonargraphBuild');
    });

    it('should use default execPowerShellAsync when no executor is provided', () => {
      const defaultTool = new SonargraphBuildTool();

      expect(defaultTool).toBeInstanceOf(SonargraphBuildTool);
      expect(defaultTool.name).toBe('Sonargraph_Build');
    });

    it('should have correct parameter schema with required systemPath', () => {
      const validParams = {
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
        reportPath: null,
        reportType: null,
      };

      const result = tool.parametersSchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it('should validate that systemPath is required', () => {
      const invalidParams = {
        reportPath: 'C:\\Reports\\report.xml',
      };

      const result = tool.parametersSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    it('should accept valid reportType values', () => {
      const validTypes = ['xml', 'html', 'delta'] as const;

      validTypes.forEach((type) => {
        const result = tool.parametersSchema.safeParse({
          systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
          reportType: type,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid reportType values', () => {
      const result = tool.parametersSchema.safeParse({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
        reportType: 'json',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('invoke - Missing Environment Variables', () => {
    it('should return error when SONARGRAPH_INSTALLATION_PATH is not set', async () => {
      vi.stubEnv('SONARGRAPH_INSTALLATION_PATH', '');

      const result = await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('SONARGRAPH_INSTALLATION_PATH');
    });

    it('should return error when SONARGRAPH_LICENSE_CODE is not set', async () => {
      vi.stubEnv('SONARGRAPH_LICENSE_CODE', '');

      const result = await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('SONARGRAPH_LICENSE_CODE');
    });
  });

  describe('invoke - Success Cases', () => {
    it('should execute Sonargraph analysis with only required systemPath', async () => {
      const mockOutput = 'Sonargraph analysis completed successfully.\nMetrics extracted.';
      mockExecutor.mockResolvedValue({ stdout: mockOutput, stderr: '' });

      const result = await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
      });

      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockExecutor).toHaveBeenCalledWith(
        expect.stringContaining(`-activationCode "${MOCK_LICENSE_CODE}"`)
      );
      expect(mockExecutor).toHaveBeenCalledWith(
        expect.stringContaining(`-system "C:\\Projects\\MyApp\\MyApp.sonargraph"`)
      );
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(mockOutput);
    });

    it('should include report parameters when reportPath is provided', async () => {
      const mockOutput = 'Report generated at C:\\Reports\\report.xml';
      mockExecutor.mockResolvedValue({ stdout: mockOutput, stderr: '' });

      await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
        reportPath: 'C:\\Reports\\report.xml',
        reportType: 'xml',
      });

      expect(mockExecutor).toHaveBeenCalledWith(
        expect.stringContaining(`-report "C:\\Reports\\report.xml"`)
      );
      expect(mockExecutor).toHaveBeenCalledWith(
        expect.stringContaining(`-reportType xml`)
      );
    });

    it('should generate HTML report when reportType is html', async () => {
      mockExecutor.mockResolvedValue({ stdout: 'HTML report generated.', stderr: '' });

      await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
        reportPath: 'C:\\Reports\\report.html',
        reportType: 'html',
      });

      expect(mockExecutor).toHaveBeenCalledWith(
        expect.stringContaining(`-reportType html`)
      );
    });

    it('should omit -reportType when reportPath is provided but reportType is null', async () => {
      mockExecutor.mockResolvedValue({ stdout: 'Analysis done.', stderr: '' });

      await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
        reportPath: 'C:\\Reports\\report.xml',
        reportType: null,
      });

      const calledCommand: string = mockExecutor.mock.calls[0][0];
      expect(calledCommand).toContain(`-report "C:\\Reports\\report.xml"`);
      expect(calledCommand).not.toContain('-reportType');
    });

    it('should not append report arguments when reportPath is null', async () => {
      mockExecutor.mockResolvedValue({ stdout: 'Analysis done.', stderr: '' });

      await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
        reportPath: null,
      });

      const calledCommand: string = mockExecutor.mock.calls[0][0];
      expect(calledCommand).not.toContain('-report');
      expect(calledCommand).not.toContain('-reportType');
    });

    it('should use stderr as output when stdout is empty', async () => {
      const stderrOutput = 'Warning: some metrics could not be computed.';
      mockExecutor.mockResolvedValue({ stdout: '', stderr: stderrOutput });

      const result = await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
      });

      expect(result.content[0].text).toBe(stderrOutput);
      expect(result.isError).toBeUndefined();
    });

    it('should use SONARGRAPH_INSTALLATION_PATH from environment in the command', async () => {
      mockExecutor.mockResolvedValue({ stdout: 'done', stderr: '' });

      await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
      });

      const calledCommand: string = mockExecutor.mock.calls[0][0];
      expect(calledCommand).toContain(MOCK_INSTALLATION_PATH);
      expect(calledCommand).toContain('SonargraphBuild.bat');
    });

    it('should return valid CallToolResult on success', async () => {
      mockExecutor.mockResolvedValue({ stdout: '{}', stderr: '' });

      const result: CallToolResult = await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
      });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });
  });

  describe('invoke - Error Cases', () => {
    it('should return formatted error when execution fails', async () => {
      const errorMessage = 'SonargraphBuild: command not found';
      mockExecutor.mockRejectedValue(new Error(errorMessage));

      const result = await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error while running Sonargraph analysis');
      expect(result.content[0].text).toContain(errorMessage);
    });

    it('should handle non-Error exceptions', async () => {
      mockExecutor.mockRejectedValue('String error');

      const result = await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error while running Sonargraph analysis');
      expect(result.content[0].text).toContain('String error');
    });

    it('should maintain MCP format even in case of error', async () => {
      mockExecutor.mockRejectedValue(new Error('Test error'));

      const result = await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.isError).toBe(true);
    });
  });

  describe('invoke - Command Construction', () => {
    it('should use PowerShell call operator & to run the executable', async () => {
      mockExecutor.mockResolvedValue({ stdout: 'done', stderr: '' });

      await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
      });

      const calledCommand: string = mockExecutor.mock.calls[0][0];
      expect(calledCommand).toMatch(/^& "/);
    });

    it('should handle system paths with spaces', async () => {
      mockExecutor.mockResolvedValue({ stdout: 'done', stderr: '' });

      await tool.invoke({
        systemPath: 'C:\\My Projects\\My App\\MyApp.sonargraph',
      });

      const calledCommand: string = mockExecutor.mock.calls[0][0];
      expect(calledCommand).toContain('"C:\\My Projects\\My App\\MyApp.sonargraph"');
    });

    it('should handle report paths with spaces', async () => {
      mockExecutor.mockResolvedValue({ stdout: 'done', stderr: '' });

      await tool.invoke({
        systemPath: 'C:\\Projects\\MyApp\\MyApp.sonargraph',
        reportPath: 'C:\\My Reports\\sonargraph report.xml',
        reportType: 'xml',
      });

      const calledCommand: string = mockExecutor.mock.calls[0][0];
      expect(calledCommand).toContain('"C:\\My Reports\\sonargraph report.xml"');
    });
  });

  describe('Integration with BasicTool', () => {
    it('should inherit base class properties correctly', () => {
      expect(tool.name).toBe('Sonargraph_Build');
      expect(tool.description).toBeTruthy();
      expect(tool.parametersSchema).toBeDefined();
    });

    it('should implement abstract invoke method', () => {
      expect(typeof tool.invoke).toBe('function');
    });
  });
});
