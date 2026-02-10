import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DirectoryNavigationTool } from './DirectoryNavigationTool.js';

describe('DirectoryNavigationTool ', () => {
  let mockExecutor: ReturnType<typeof vi.fn>;
  let tool: DirectoryNavigationTool;

  beforeEach(() => {
    // Setup: creates a simple and reusable mock executor
    mockExecutor = vi.fn();
    tool = new DirectoryNavigationTool(mockExecutor);
  });
  describe('Constructor', () => {
    it('should initialize with a custom executor', () => {
      const customExecutor = vi.fn();
      const toolInstance = new DirectoryNavigationTool(customExecutor);
      expect(toolInstance).toBeDefined();
    });

    it('should have correct tool name', () => {
      expect(tool['name']).toBe('PowerShell_Directory_Navigation');
    });

    it('should have description', () => {
      expect(tool['description']).toBeDefined();
      expect(tool['description']).toContain('navigate through other directories');
    });

    it('should have correct schema', () => {
      expect(tool['parametersSchema']).toBeDefined();
    });
  });

  describe('invoke - Success Cases', () => {
    it('should successfully change directory when given a valid path', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '', stderr: '' });

      const result = await tool.invoke({ path: 'C:\\Users\\test' });

      expect(result).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('');
      expect(result.isError).toBeUndefined();
    });

    it('should support navigating to parent directory using ..', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '', stderr: '' });

      const result = await tool.invoke({ path: '..' });

      expect(result.content[0].text).toBe('');
      expect(mockExecutor).toHaveBeenCalledWith(`cd ".."`);
    });

    it('should return properly formatted CallToolResult', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '', stderr: '' });

      const result: CallToolResult = await tool.invoke({ path: 'C:\\temp' });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text', '');
    });
  });

  describe('invoke - Error Cases', () => {
    it('should return error result when executor throws an error', async () => {
      const errorMessage = 'Path not found';
      mockExecutor.mockRejectedValueOnce(new Error(errorMessage));

      const result = await tool.invoke({ path: 'C:\\invalid-path' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error while getting project static analysis');
      expect(result.content[0].text).toContain(errorMessage);
    });

    it('should handle permission denied errors gracefully', async () => {
      const errorMessage = 'Access denied';
      mockExecutor.mockRejectedValueOnce(new Error(errorMessage));

      const result = await tool.invoke({ path: 'C:\\protected-folder' });

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error while getting project static analysis');
    });
  });

  describe('invoke - Command Validation', () => {
    it('should call executor with correct cd command for given path', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '', stderr: '' });
      const testPath = 'C:\\Users\\test\\Documents';

      await tool.invoke({ path: testPath });

      expect(mockExecutor).toHaveBeenCalledWith(`cd "${testPath}"`);
    });

    it('should wrap path in quotes to handle spaces', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '', stderr: '' });
      const testPath = 'C:\\Program Files\\My App';

      await tool.invoke({ path: testPath });

      expect(mockExecutor).toHaveBeenCalledWith(`cd "${testPath}"`);
    });

    it('should execute exactly once per invoke call', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '', stderr: '' });

      await tool.invoke({ path: 'C:\\test' });

      expect(mockExecutor).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration with DirectoryNavigationTool', () => {
    it('should successfully execute complete workflow with multiple navigations', async () => {
      mockExecutor
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      const res1 = await tool.invoke({ path: 'C:\\project' });
      const res2 = await tool.invoke({ path: '..' });

      expect(res1.isError).toBeUndefined();
      expect(res2.isError).toBeUndefined();
      expect(mockExecutor).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle paths with special characters', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '', stderr: '' });
      const pathWithSpecialChars = 'C:\\Users\\test$folder\\(backup)';

      await tool.invoke({ path: pathWithSpecialChars });

      expect(mockExecutor).toHaveBeenCalledWith(`cd "${pathWithSpecialChars}"`);
    });

    it('should handle paths with quotes by wrapping in outer quotes', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '', stderr: '' });
      const pathWithQuotes = 'C:\\test"folder';

      await tool.invoke({ path: pathWithQuotes });

      expect(mockExecutor).toHaveBeenCalledWith(`cd "${pathWithQuotes}"`);
    });

    it('should handle very long path strings', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '', stderr: '' });
      const longPath = 'C:\\' + 'very\\'.repeat(50) + 'long\\path';

      await tool.invoke({ path: longPath });

      expect(mockExecutor).toHaveBeenCalled();
    });

    it('should handle paths with unicode characters', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '', stderr: '' });
      const unicodePath = 'C:\\Users\\test\\文件夹';

      await tool.invoke({ path: unicodePath });

      expect(mockExecutor).toHaveBeenCalledWith(`cd "${unicodePath}"`);
    });

    it('should handle consecutive navigations reliably', async () => {
      mockExecutor
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      await tool.invoke({ path: 'C:\\a' });
      await tool.invoke({ path: '..' });
      await tool.invoke({ path: 'C:\\a\\b' });

      expect(mockExecutor).toHaveBeenCalledTimes(3);
    });
  });
});

