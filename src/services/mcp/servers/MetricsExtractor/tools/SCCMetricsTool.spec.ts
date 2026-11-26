import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SCCMetricsTool } from './SCCMetricsTool.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

describe('SCCMetricsTool', () => {
  let mockExecutor: ReturnType<typeof vi.fn>;
  let tool: SCCMetricsTool;

  beforeEach(() => {
    // Setup: creates a simple and reusable mock executor
    mockExecutor = vi.fn();
    tool = new SCCMetricsTool(mockExecutor);
  });

  describe('Constructor', () => {
    it('should initialize with custom executor', () => {
      const customExecutor = vi.fn();
      const customTool = new SCCMetricsTool(customExecutor);

      expect(customTool).toBeInstanceOf(SCCMetricsTool);
      expect(customTool.name).toBe('SCC_Metrics');
      expect(customTool.description).toContain('software metrics');
    });

    it('should use default execAsync when no executor is provided', () => {
      const defaultTool = new SCCMetricsTool();
      
      expect(defaultTool).toBeInstanceOf(SCCMetricsTool);
      expect(defaultTool.name).toBe('SCC_Metrics');
    });

    it('should have correct parameters schema', () => {
      const params = {
        path: '/test/path',
        sccFlags: null
      };

      // Verifies that the schema accepts the expected parameters
      const result = tool.parametersSchema.safeParse(params);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.path).toBe('/test/path');
        expect(result.data.sccFlags).toBeNull();
      }
    });

    it('should validate that path is required', () => {
      const invalidParams = {
        sccFlags: '--some-flag'
      };

      const result = tool.parametersSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    it('should accept sccFlags as string or null', () => {
      const paramsWithFlags = {
        path: '/test/path',
        sccFlags: '--format json --no-cocomo'
      };

      const result = tool.parametersSchema.safeParse(paramsWithFlags);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sccFlags).toBe('--format json --no-cocomo');
      }
    });
  });

  describe('invoke - Success Cases', () => {
    it('should execute SCC command with provided path and return formatted result', async () => {
      const mockStdout = JSON.stringify([
        {
          Name: 'TypeScript',
          Bytes: 8795,
          CodeBytes: 0,
          Lines: 307,
          Code: 248,
          Comment: 8,
          Blank: 51,
          Complexity: 11,
          Count: 14,
          WeightedComplexity: 0,
          Files: []
        }
      ]);

      mockExecutor.mockResolvedValue({
        stdout: mockStdout,
        stderr: ''
      });

      const result = await tool.invoke({
        path: '/test/project',
        sccFlags: null
      });

      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockExecutor).toHaveBeenCalledWith('scc "/test/project"  --format json');
      
      expect(result).toEqual<CallToolResult>({
        content: [
          {
            type: 'text',
            text: mockStdout
          }
        ]
      });
      expect(result.isError).toBeUndefined();
    });

    it('should include sccFlags in command when provided', async () => {
      const mockStdout = '{"result": "success"}';
      
      mockExecutor.mockResolvedValue({
        stdout: mockStdout,
        stderr: ''
      });

      const result = await tool.invoke({
        path: '/test/project',
        sccFlags: '--no-cocomo --no-complexity'
      });

      expect(mockExecutor).toHaveBeenCalledWith(
        'scc "/test/project" --no-cocomo --no-complexity --format json'
      );

      expect(result.content[0].text).toBe(mockStdout);
    });

    it('should handle empty stdout', async () => {
      mockExecutor.mockResolvedValue({
        stdout: '',
        stderr: ''
      });

      const result = await tool.invoke({
        path: '/empty/project',
        sccFlags: null
      });

      expect(result.content[0].text).toBe('');
      expect(result.isError).toBeUndefined();
    });

    it('should preserve JSON formatting from stdout', async () => {
      const complexJson = JSON.stringify([
        { Name: 'TypeScript', Lines: 100 },
        { Name: 'JavaScript', Lines: 200 }
      ], null, 2);

      mockExecutor.mockResolvedValue({
        stdout: complexJson,
        stderr: ''
      });

      const result = await tool.invoke({
        path: '/test/project',
        sccFlags: null
      });

      expect(result.content[0].text).toBe(complexJson);
    });

    it('should correctly escape paths with spaces', async () => {
      mockExecutor.mockResolvedValue({
        stdout: '{}',
        stderr: ''
      });

      await tool.invoke({
        path: '/path with spaces/project',
        sccFlags: null
      });

      expect(mockExecutor).toHaveBeenCalledWith(
        'scc "/path with spaces/project"  --format json'
      );
    });

    it('should handle paths with special characters', async () => {
      mockExecutor.mockResolvedValue({
        stdout: '{}',
        stderr: ''
      });

      await tool.invoke({
        path: '/path/with-special_chars@123',
        sccFlags: null
      });

      expect(mockExecutor).toHaveBeenCalledWith(
        'scc "/path/with-special_chars@123"  --format json'
      );
    });
  });

  describe('invoke - Error Cases', () => {
    it('should return formatted error when execution fails', async () => {
      const errorMessage = 'scc: command not found';
      const error = new Error(errorMessage);
      
      mockExecutor.mockRejectedValue(error);

      const result = await tool.invoke({
        path: '/invalid/path',
        sccFlags: null
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error while getting project static analysis');
      expect(result.content[0].text).toContain(errorMessage);
    });

    it('should include complete error message in result', async () => {
      const detailedError = new Error('Process exited with code 1: Invalid path');
      mockExecutor.mockRejectedValue(detailedError);

      const result = await tool.invoke({
        path: '/nonexistent/path',
        sccFlags: null
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid path');
    });

    it('should handle errors that are not Error instances', async () => {
      mockExecutor.mockRejectedValue('String error');

      const result = await tool.invoke({
        path: '/test/path',
        sccFlags: null
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error while getting project static analysis');
      expect(result.content[0].text).toContain('String error');
    });

    it('should handle errors that have stderr but no stdout', async () => {
      const error = new Error('Command failed');
      (error as any).stderr = 'scc: permission denied';
      (error as any).stdout = '';
      
      mockExecutor.mockRejectedValue(error);

      const result = await tool.invoke({
        path: '/protected/path',
        sccFlags: null
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Command failed');
    });

    it('should maintain MCP format even in case of error', async () => {
      mockExecutor.mockRejectedValue(new Error('Test error'));

      const result = await tool.invoke({
        path: '/test/path',
        sccFlags: null
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.isError).toBe(true);
    });
  });

  describe('invoke - Command Validation', () => {
    it('should build command correctly without flags', async () => {
      mockExecutor.mockResolvedValue({ stdout: '{}', stderr: '' });

      await tool.invoke({
        path: '/test',
        sccFlags: null
      });

      const calledCommand = mockExecutor.mock.calls[0][0];
      expect(calledCommand).toMatch(/^scc "/);
      expect(calledCommand).toContain('--format json');
      expect(calledCommand).not.toContain('null');
    });

    it('should build command correctly with empty flags', async () => {
      mockExecutor.mockResolvedValue({ stdout: '{}', stderr: '' });

      await tool.invoke({
        path: '/test',
        sccFlags: ''
      });

      const calledCommand = mockExecutor.mock.calls[0][0];
      expect(calledCommand).toBe('scc "/test"  --format json');
    });

    it('should build command with multiple flags', async () => {
      mockExecutor.mockResolvedValue({ stdout: '{}', stderr: '' });

      await tool.invoke({
        path: '/test',
        sccFlags: '--no-cocomo --no-complexity --no-git'
      });

      expect(mockExecutor).toHaveBeenCalledWith(
        'scc "/test" --no-cocomo --no-complexity --no-git --format json'
      );
    });
  });

  describe('Integration with MetricsTool', () => {
    it('should inherit base class properties correctly', () => {
      expect(tool.name).toBe('SCC_Metrics');
      expect(tool.description).toBeTruthy();
      expect(tool.parametersSchema).toBeDefined();
    });

    it('should implement abstract invoke method', () => {
      expect(typeof tool.invoke).toBe('function');
    });

    it('should return valid CallToolResult', async () => {
      mockExecutor.mockResolvedValue({
        stdout: '{}',
        stderr: ''
      });

      const result = await tool.invoke({
        path: '/test',
        sccFlags: null
      });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long path', async () => {
      const longPath = '/'.repeat(1000) + 'project';
      mockExecutor.mockResolvedValue({ stdout: '{}', stderr: '' });

      await tool.invoke({
        path: longPath,
        sccFlags: null
      });

      expect(mockExecutor).toHaveBeenCalled();
      const calledCommand = mockExecutor.mock.calls[0][0];
      expect(calledCommand).toContain(longPath);
    });

    it('should handle very long sccFlags', async () => {
      const longFlags = '--flag ' + 'value '.repeat(100);
      mockExecutor.mockResolvedValue({ stdout: '{}', stderr: '' });

      await tool.invoke({
        path: '/test',
        sccFlags: longFlags
      });

      expect(mockExecutor).toHaveBeenCalled();
      const calledCommand = mockExecutor.mock.calls[0][0];
      expect(calledCommand).toContain(longFlags);
    });

    it('should handle stdout containing newlines and special characters', async () => {
      const specialOutput = '{\n  "data": "test\\nvalue"\n}';
      mockExecutor.mockResolvedValue({
        stdout: specialOutput,
        stderr: ''
      });

      const result = await tool.invoke({
        path: '/test',
        sccFlags: null
      });

      expect(result.content[0].text).toBe(specialOutput);
    });

    it('should handle multiple sequential calls', async () => {
      mockExecutor
        .mockResolvedValueOnce({ stdout: '{}', stderr: '' })
        .mockResolvedValueOnce({ stdout: '{"result": 2}', stderr: '' });

      const result1 = await tool.invoke({
        path: '/path1',
        sccFlags: null
      });

      const result2 = await tool.invoke({
        path: '/path2',
        sccFlags: '--flag'
      });

      expect(mockExecutor).toHaveBeenCalledTimes(2);
      expect(result1.content[0].text).toBe('{}');
      expect(result2.content[0].text).toBe('{"result": 2}');
    });

    it('should handle concurrent calls', async () => {
      mockExecutor.mockResolvedValue({ stdout: '{}', stderr: '' });

      const promises = [
        tool.invoke({ path: '/path1', sccFlags: null }),
        tool.invoke({ path: '/path2', sccFlags: null }),
        tool.invoke({ path: '/path3', sccFlags: null })
      ];

      const results = await Promise.all(promises);

      expect(mockExecutor).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.content[0].text).toBe('{}');
      });
    });
  });
});

