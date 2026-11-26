import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetFileContentTool } from './GetFileContentTool.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

describe('GetFileContentTool', () => {
  let mockExecutor: ReturnType<typeof vi.fn>;
  let tool: GetFileContentTool;

  beforeEach(() => {
    // Setup: creates a simple and reusable mock executor
    mockExecutor = vi.fn();
    tool = new GetFileContentTool(mockExecutor);
  });

  describe('Constructor', () => {
    it('should initialize with a custom executor', () => {
      const customExecutor = vi.fn();
      const toolInstance = new GetFileContentTool(customExecutor);
      expect(toolInstance).toBeDefined();
    });

    it('should have correct tool name', () => {
      expect(tool['name']).toBe('PowerShell_Get_File_Content');
    });

    it('should have a description mentioning PowerShell and Get-Content', () => {
      expect(tool['description']).toBeDefined();
      expect(tool['description']).toContain("PowerShell's Get-Content");
      expect(tool['description']).toContain('absolute or relative paths');
    });

    it('should have examples in description', () => {
      expect(tool['description']).toContain('Examples:');
      expect(tool['description']).toContain('C:\\Projects\\App\\Main.java');
      expect(tool['description']).toContain('src/index.ts');
    });

    it('should have correct schema', () => {
      expect(tool['parametersSchema']).toBeDefined();
    });
  });

  describe('invoke - Success Cases', () => {
    it('should successfully read file content with absolute path', async () => {
      const mockContent = 'export const config = { debug: true };';
      mockExecutor.mockResolvedValueOnce({ stdout: mockContent, stderr: '' });

      const result = await tool.invoke({ path: 'C:\\Projects\\App\\Main.ts' });

      expect(result).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe(mockContent);
      expect(result.isError).toBeUndefined();
      expect(mockExecutor).toHaveBeenCalledWith(
        'Get-Content -Path "C:\\Projects\\App\\Main.ts"'
      );
    });

    it('should successfully read file content with relative path', async () => {
      const mockContent = 'import { Router } from "express";';
      mockExecutor.mockResolvedValueOnce({ stdout: mockContent, stderr: '' });

      const result = await tool.invoke({ path: 'src/index.ts' });

      expect(result.content[0].text).toBe(mockContent);
      expect(result.isError).toBeUndefined();
      expect(mockExecutor).toHaveBeenCalledWith(
        'Get-Content -Path "src/index.ts"'
      );
    });

    it('should successfully read file from parent directory', async () => {
      const mockContent = 'module.exports = { version: "1.0.0" };';
      mockExecutor.mockResolvedValueOnce({ stdout: mockContent, stderr: '' });

      const result = await tool.invoke({ path: '../package.json' });

      expect(result.content[0].text).toBe(mockContent);
      expect(result.isError).toBeUndefined();
    });

    it('should handle file with multiple lines', async () => {
      const mockContent = `function greet(name) {
  console.log("Hello, " + name);
}

greet("World");`;
      mockExecutor.mockResolvedValueOnce({ stdout: mockContent, stderr: '' });

      const result = await tool.invoke({ path: 'src/greet.js' });

      expect(result.content[0].text).toBe(mockContent);
      expect(result.content[0].text).toContain('function greet');
    });

    it('should return properly formatted CallToolResult', async () => {
      const mockContent = 'test content';
      mockExecutor.mockResolvedValueOnce({ stdout: mockContent, stderr: '' });

      const result: CallToolResult = await tool.invoke({ path: 'file.txt' });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text', mockContent);
    });

    it('should handle empty file content', async () => {
      mockExecutor.mockResolvedValueOnce({ stdout: '', stderr: '' });

      const result = await tool.invoke({ path: 'empty.txt' });

      expect(result.content[0].text).toBe('');
      expect(result.isError).toBeUndefined();
    });

    it('should handle special characters in file path', async () => {
      const mockContent = 'Special file content';
      mockExecutor.mockResolvedValueOnce({ stdout: mockContent, stderr: '' });

      const result = await tool.invoke({
        path: 'C:\\Users\\Test User\\Documents\\my-file (1).txt',
      });

      expect(result.content[0].text).toBe(mockContent);
      expect(mockExecutor).toHaveBeenCalledWith(
        'Get-Content -Path "C:\\Users\\Test User\\Documents\\my-file (1).txt"'
      );
    });

    it('should handle paths with spaces', async () => {
      const mockContent = 'Content from spaced directory';
      mockExecutor.mockResolvedValueOnce({ stdout: mockContent, stderr: '' });

      const result = await tool.invoke({
        path: 'My Documents/Project Name/src/index.ts',
      });

      expect(result.content[0].text).toBe(mockContent);
    });
  });

  describe('invoke - Error Cases', () => {
    it('should return error result when executor throws', async () => {
      const errorMessage = 'Cannot find path';
      mockExecutor.mockRejectedValueOnce(new Error(errorMessage));

      const result = await tool.invoke({ path: 'C:\\nonexistent\\file.txt' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error while getting project static analysis');
      expect(result.content[0].text).toContain(errorMessage);
    });

    it('should handle file not found error', async () => {
      const errorMessage = "Get-Content : Cannot find path 'C:\\Users\\file.txt'";
      mockExecutor.mockRejectedValueOnce(new Error(errorMessage));

      const result = await tool.invoke({ path: 'C:\\Users\\file.txt' });

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain(errorMessage);
    });

    it('should handle permission denied error', async () => {
      const errorMessage = 'Access to the path is denied';
      mockExecutor.mockRejectedValueOnce(new Error(errorMessage));

      const result = await tool.invoke({ path: 'C:\\Windows\\system32\\protected.txt' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(errorMessage);
    });

    it('should handle invalid path error', async () => {
      const errorMessage = 'Invalid path characters';
      mockExecutor.mockRejectedValueOnce(new Error(errorMessage));

      const result = await tool.invoke({ path: 'invalid<path>.txt' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error while getting project static analysis');
    });

    it('should return error with proper MCP format when operation fails', async () => {
      mockExecutor.mockRejectedValueOnce(new Error('Unexpected error'));

      const result: CallToolResult = await tool.invoke({ path: 'test.txt' });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.isError).toBe(true);
    });
  });

  describe('executor invocation', () => {
    it('should call executor with correct PowerShell command syntax', async () => {
      const testPath = 'C:\\test\\file.txt';
      mockExecutor.mockResolvedValueOnce({ stdout: 'content', stderr: '' });

      await tool.invoke({ path: testPath });

      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockExecutor).toHaveBeenCalledWith(`Get-Content -Path "${testPath}"`);
    });

    it('should escape quotes in file paths', async () => {
      const pathWithQuotes = 'C:\\test\\"quoted folder"\\file.txt';
      mockExecutor.mockResolvedValueOnce({ stdout: 'content', stderr: '' });

      await tool.invoke({ path: pathWithQuotes });

      expect(mockExecutor).toHaveBeenCalledWith(
        `Get-Content -Path "${pathWithQuotes}"`
      );
    });
  });
});
