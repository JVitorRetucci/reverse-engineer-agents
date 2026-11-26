import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListDirectoriesTool } from './ListDirectoriesTool.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

describe('ListDirectoriesTool', () => {
  let mockExecutor: ReturnType<typeof vi.fn>;
  let tool: ListDirectoriesTool;

  beforeEach(() => {
    // Setup: creates a simple and reusable mock executor
    mockExecutor = vi.fn();
    tool = new ListDirectoriesTool(mockExecutor);
  });

  describe('Constructor', () => {
    it('should initialize with a custom executor', () => {
      const customExecutor = vi.fn();
      const toolInstance = new ListDirectoriesTool(customExecutor);
      expect(toolInstance).toBeDefined();
    });

    it('should have correct tool name', () => {
      expect(tool['name']).toBe('PowerShell_Directory_Listing');
    });

    it('should have description', () => {
      expect(tool['description']).toBeDefined();
      expect(tool['description']).toContain('discover files and other directories');
    });

    it('should have correct schema', () => {
      expect(tool['parametersSchema']).toBeDefined();
    });
  });

  describe('invoke - Success Cases', () => {
    it('should successfully list directories when given a valid path', async () => {
      const mockOutput = JSON.stringify([
        { Name: 'folder1', Extension: '', PSIsContainer: true },
        { Name: 'file.txt', Extension: '.txt', PSIsContainer: false },
      ]);

      mockExecutor.mockResolvedValueOnce({ stdout: mockOutput, stderr: '' });

      const result = await tool.invoke({ path: 'C:\\Users\\test' });

      expect(result).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe(mockOutput);
      expect(result.isError).toBeUndefined();
    });

    it('should handle null path value', async () => {
      const mockOutput = JSON.stringify([
        { Name: 'folder1', Extension: '', PSIsContainer: true },
      ]);

      mockExecutor.mockResolvedValueOnce({ stdout: mockOutput, stderr: '' });

      const result = await tool.invoke({ path: null });

      expect(result).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe(mockOutput);
    });

    it('should return properly formatted CallToolResult', async () => {
      const mockOutput = '[]';
      mockExecutor.mockResolvedValueOnce({ stdout: mockOutput, stderr: '' });

      const result: CallToolResult = await tool.invoke({ path: 'C:\\temp' });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    it('should return empty array when directory is empty', async () => {
      const mockOutput = '[]';
      mockExecutor.mockResolvedValueOnce({ stdout: mockOutput, stderr: '' });

      const result = await tool.invoke({ path: 'C:\\empty-folder' });

      expect(result.content[0].text).toBe('[]');
      expect(result.isError).toBeUndefined();
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

    it('should handle command execution timeout', async () => {
      const errorMessage = 'Command timeout';
      mockExecutor.mockRejectedValueOnce(new Error(errorMessage));

      const result = await tool.invoke({ path: 'C:\\some-path' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error while getting project static analysis');
    });

    it('should handle unexpected executor errors', async () => {
      const unexpectedError = new Error('Unexpected system error');
      mockExecutor.mockRejectedValueOnce(unexpectedError);

      const result = await tool.invoke({ path: 'C:\\test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error while getting project static analysis');
    });
  });

  describe('invoke - Command Validation', () => {
    it('should call executor with correct PowerShell command for given path', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '[]', stderr: '' });
      const testPath = 'C:\\Users\\test\\Documents';

      await tool.invoke({ path: testPath });

      expect(mockExecutor).toHaveBeenCalledWith(
        `Get-ChildItem -Path "${testPath}" -Force | Select-Object Name, Extension, PSIsContainer | ConvertTo-Json`
      );
    });

    it('should wrap path in quotes to handle spaces', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '[]', stderr: '' });
      const testPath = 'C:\\Program Files\\My App';

      await tool.invoke({ path: testPath });

      expect(mockExecutor).toHaveBeenCalledWith(
        `Get-ChildItem -Path "${testPath}" -Force | Select-Object Name, Extension, PSIsContainer | ConvertTo-Json`
      );
    });

    it('should execute exactly once per invoke call', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '[]', stderr: '' });

      await tool.invoke({ path: 'C:\\test' });

      expect(mockExecutor).toHaveBeenCalledTimes(1);
    });

    it('should use current directory (.) when path is null', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '[]', stderr: '' });

      await tool.invoke({ path: null });

      expect(mockExecutor).toHaveBeenCalledWith(
        `Get-ChildItem -Path "." -Force | Select-Object Name, Extension, PSIsContainer | ConvertTo-Json`
      );
    });
  });

  describe('Integration with ListDirectoriesTool', () => {
    it('should successfully execute complete workflow with realistic data', async () => {
      const realisticOutput = JSON.stringify([
        { Name: 'src', Extension: '', PSIsContainer: true },
        { Name: 'package.json', Extension: '.json', PSIsContainer: false },
        { Name: 'README.md', Extension: '.md', PSIsContainer: false },
        { Name: 'node_modules', Extension: '', PSIsContainer: true },
      ]);

      mockExecutor.mockResolvedValueOnce({ stdout: realisticOutput, stderr: '' });

      const result = await tool.invoke({ path: 'C:\\project' });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe(realisticOutput);

      // Verify the data can be parsed back as JSON
      const parsedData = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsedData)).toBe(true);
      expect(parsedData.length).toBe(4);
    });

    it('should maintain executor state across multiple invocations', async () => {
      mockExecutor
        .mockResolvedValueOnce({ stdout: '[]', stderr: '' })
        .mockResolvedValueOnce({ stdout: '[{"Name":"file.txt"}]', stderr: '' });

      await tool.invoke({ path: 'C:\\folder1' });
      await tool.invoke({ path: 'C:\\folder2' });

      expect(mockExecutor).toHaveBeenCalledTimes(2);
      expect(mockExecutor).toHaveBeenNthCalledWith(
        1,
        `Get-ChildItem -Path "C:\\folder1" -Force | Select-Object Name, Extension, PSIsContainer | ConvertTo-Json`
      );
      expect(mockExecutor).toHaveBeenNthCalledWith(
        2,
        `Get-ChildItem -Path "C:\\folder2" -Force | Select-Object Name, Extension, PSIsContainer | ConvertTo-Json`
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle paths with special characters', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '[]', stderr: '' });
      const pathWithSpecialChars = 'C:\\Users\\test$folder\\(backup)';

      await tool.invoke({ path: pathWithSpecialChars });

      expect(mockExecutor).toHaveBeenCalledWith(
        `Get-ChildItem -Path "${pathWithSpecialChars}" -Force | Select-Object Name, Extension, PSIsContainer | ConvertTo-Json`
      );
    });

    it('should handle paths with quotes by wrapping in outer quotes', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '[]', stderr: '' });
      const pathWithQuotes = 'C:\\test"folder';

      await tool.invoke({ path: pathWithQuotes });

      expect(mockExecutor).toHaveBeenCalledWith(
        `Get-ChildItem -Path "${pathWithQuotes}" -Force | Select-Object Name, Extension, PSIsContainer | ConvertTo-Json`
      );
    });

    it('should handle very long path strings', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '[]', stderr: '' });
      const longPath = 'C:\\' + 'very\\'.repeat(50) + 'long\\path';

      await tool.invoke({ path: longPath });

      expect(mockExecutor).toHaveBeenCalled();
    });

    it('should handle paths with unicode characters', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '[]', stderr: '' });
      const unicodePath = 'C:\\Users\\test\\文件夹';

      await tool.invoke({ path: unicodePath });

      expect(mockExecutor).toHaveBeenCalledWith(
        `Get-ChildItem -Path "${unicodePath}" -Force | Select-Object Name, Extension, PSIsContainer | ConvertTo-Json`
      );
    });

    it('should handle output with special JSON formatting', async () => {
      const complexOutput = JSON.stringify([
        { Name: 'file with spaces.txt', Extension: '.txt', PSIsContainer: false },
        { Name: 'folder[1]', Extension: '', PSIsContainer: true },
        { Name: 'special#chars', Extension: '.file', PSIsContainer: false },
      ]);

      mockExecutor.mockResolvedValueOnce({ stdout: complexOutput, stderr: '' });

      const result = await tool.invoke({ path: 'C:\\test' });

      expect(result.content[0].text).toBe(complexOutput);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].Name).toBe('file with spaces.txt');
    });

    it('should handle large directory listings', async () => {
      const largeOutput = JSON.stringify(
        Array.from({ length: 1000 }, (_, i) => ({
          Name: `file${i}.txt`,
          Extension: '.txt',
          PSIsContainer: false,
        }))
      );

      mockExecutor.mockResolvedValueOnce({ stdout: largeOutput, stderr: '' });

      const result = await tool.invoke({ path: 'C:\\large-dir' });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.length).toBe(1000);
    });

    it('should handle mixed files and directories in output', async () => {
      const mixedOutput = JSON.stringify([
        { Name: 'src', Extension: '', PSIsContainer: true },
        { Name: 'test.js', Extension: '.js', PSIsContainer: false },
        { Name: 'config', Extension: '', PSIsContainer: true },
        { Name: 'README.md', Extension: '.md', PSIsContainer: false },
        { Name: 'node_modules', Extension: '', PSIsContainer: true },
      ]);

      mockExecutor.mockResolvedValueOnce({ stdout: mixedOutput, stderr: '' });

      const result = await tool.invoke({ path: 'C:\\project' });

      const parsed = JSON.parse(result.content[0].text);
      const directories = parsed.filter((item: any) => item.PSIsContainer === true);
      const files = parsed.filter((item: any) => item.PSIsContainer === false);

      expect(directories.length).toBe(3);
      expect(files.length).toBe(2);
    });
  });
});

