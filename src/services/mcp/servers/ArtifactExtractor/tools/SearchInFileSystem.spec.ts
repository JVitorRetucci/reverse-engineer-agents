import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchInFileSystemTool } from './SearchInFileSystemTool.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

describe('SearchInFileSystemTool', () => {
  let mockExecutor: ReturnType<typeof vi.fn>;
  let tool: SearchInFileSystemTool;

  function getTextContent(result: CallToolResult): string {
    const content = result.content[0];

    if (content.type !== 'text') {
      throw new Error('Expected text content');
    }

    return content.text;
  }

  beforeEach(() => {
    mockExecutor = vi.fn();
    tool = new SearchInFileSystemTool(mockExecutor);
  });

  describe('Constructor', () => {
    it('should initialize with a custom executor', () => {
      const customExecutor = vi.fn();
      const toolInstance = new SearchInFileSystemTool(customExecutor);
      expect(toolInstance).toBeDefined();
    });

    it('should have correct tool name', () => {
      expect(tool['name']).toBe('PowerShell_Search_In_File_System');
    });

    it('should have description', () => {
      expect(tool['description']).toBeDefined();
      expect(tool['description']).toContain('search recursively for files');
    });

    it('should have correct schema', () => {
      expect(tool['parametersSchema']).toBeDefined();
    });
  });

  describe('invoke - Success Cases', () => {
    it('should successfully search files when given a valid path and pattern', async () => {
      const mockOutput = JSON.stringify([
        { Name: 'UserController.java', DirectoryName: 'C:\\project\\src\\main\\java\\app\\controllers' },
        { Name: 'OrderController.java', DirectoryName: 'C:\\project\\src\\main\\java\\app\\controllers' },
      ]);

      mockExecutor.mockResolvedValueOnce({ stdout: mockOutput, stderr: '' });

      const result = await tool.invoke({
        path: 'C:\\project',
        pattern: 'Controller.*\\.java$',
      });

      expect(result).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(getTextContent(result)).toBe(mockOutput);
      expect(result.isError).toBeUndefined();
    });

    it('should handle null path value and use current directory', async () => {
      const mockOutput = JSON.stringify([
        { Name: 'UserController.java', DirectoryName: '.\\src\\controllers' },
      ]);

      mockExecutor.mockResolvedValueOnce({ stdout: mockOutput, stderr: '' });

      const result = await tool.invoke({
        path: null,
        pattern: 'Controller.*\\.java$',
      });

      expect(result).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(getTextContent(result)).toBe(mockOutput);
    });

    it('should return properly formatted CallToolResult', async () => {
      const mockOutput = '[]';
      mockExecutor.mockResolvedValueOnce({ stdout: mockOutput, stderr: '' });

      const result: CallToolResult = await tool.invoke({
        path: 'C:\\temp',
        pattern: 'Controller.*\\.java$',
      });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    it('should return empty array when no files match', async () => {
      const mockOutput = '[]';
      mockExecutor.mockResolvedValueOnce({ stdout: mockOutput, stderr: '' });

      const result = await tool.invoke({
        path: 'C:\\empty-folder',
        pattern: 'DoesNotExist.*\\.java$',
      });

      expect(getTextContent(result)).toBe('[]');
      expect(result.isError).toBeUndefined();
    });
  });

  describe('invoke - Error Cases', () => {
    it('should return error result when executor throws an error', async () => {
      const errorMessage = 'Path not found';
      mockExecutor.mockRejectedValueOnce(new Error(errorMessage));

      const result = await tool.invoke({
        path: 'C:\\invalid-path',
        pattern: 'Controller.*\\.java$',
      });

      expect(result.isError).toBe(true);
      expect(getTextContent(result)).toContain('Error while searching in file system');
      expect(getTextContent(result)).toContain(errorMessage);
    });

    it('should handle access denied errors gracefully', async () => {
      const errorMessage = 'Access denied';
      mockExecutor.mockRejectedValueOnce(new Error(errorMessage));

      const result = await tool.invoke({
        path: 'C:\\protected-folder',
        pattern: 'Controller.*\\.java$',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(getTextContent(result)).toContain('Error while searching in file system');
    });
  });

  describe('invoke - Command Validation', () => {
    it('should call executor with correct PowerShell command for given path and pattern', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '[]', stderr: '' });
      const testPath = 'C:\\Users\\test\\Documents';
      const pattern = 'Controller.*\\.java$';

      await tool.invoke({ path: testPath, pattern });

      expect(mockExecutor).toHaveBeenCalledWith(
        `@(Get-ChildItem -Path '${testPath}' -Recurse -File -Force | Where-Object { $_.Name -match '${pattern}' } | Select-Object Name, DirectoryName) | ConvertTo-Json`
      );
    });

    it('should wrap path in quotes safely when the path contains single quotes', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '[]', stderr: '' });
      const testPath = "C:\\Users\\test'space";

      await tool.invoke({
        path: testPath,
        pattern: 'Controller.*\\.java$',
      });

      expect(mockExecutor).toHaveBeenCalledWith(
        `@(Get-ChildItem -Path 'C:\\Users\\test''space' -Recurse -File -Force | Where-Object { $_.Name -match 'Controller.*\\.java$' } | Select-Object Name, DirectoryName) | ConvertTo-Json`
      );
    });

    it('should use current directory (.) when path is null', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '[]', stderr: '' });

      await tool.invoke({ path: null, pattern: 'Controller.*\\.java$' });

      expect(mockExecutor).toHaveBeenCalledWith(
        `@(Get-ChildItem -Path '.' -Recurse -File -Force | Where-Object { $_.Name -match 'Controller.*\\.java$' } | Select-Object Name, DirectoryName) | ConvertTo-Json`
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle patterns with escaped regex characters', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '[]', stderr: '' });
      const pattern = 'Controller.*\\.java$';

      await tool.invoke({
        path: 'C:\\test',
        pattern,
      });

      expect(mockExecutor).toHaveBeenCalledWith(
        `@(Get-ChildItem -Path 'C:\\test' -Recurse -File -Force | Where-Object { $_.Name -match '${pattern}' } | Select-Object Name, DirectoryName) | ConvertTo-Json`
      );
    });

    it('should handle unicode characters in path', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '[]', stderr: '' });
      const unicodePath = 'C:\\Users\\test\\文件夹';

      await tool.invoke({
        path: unicodePath,
        pattern: 'Controller.*\\.java$',
      });

      expect(mockExecutor).toHaveBeenCalledWith(
        `@(Get-ChildItem -Path '${unicodePath}' -Recurse -File -Force | Where-Object { $_.Name -match 'Controller.*\\.java$' } | Select-Object Name, DirectoryName) | ConvertTo-Json`
      );
    });

    it('should serialize output from a single match as valid JSON array output', async () => {
      const mockOutput = JSON.stringify([
        { Name: 'UserController.java', DirectoryName: 'C:\\project\\src\\controllers' },
      ]);

      mockExecutor.mockResolvedValueOnce({ stdout: mockOutput, stderr: '' });

      const result = await tool.invoke({
        path: 'C:\\project',
        pattern: 'Controller.*\\.java$',
      });

      const parsed = JSON.parse(getTextContent(result));
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].Name).toBe('UserController.java');
    });
  });
});