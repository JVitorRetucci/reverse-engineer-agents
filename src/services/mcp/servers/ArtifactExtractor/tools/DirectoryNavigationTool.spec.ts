import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { DirectoryNavigationTool } from "./DirectoryNavigationTool.js";

describe("DirectoryNavigationTool", () => {
  let tool: DirectoryNavigationTool;

  beforeEach(() => {
    tool = new DirectoryNavigationTool();
  });

  describe("Constructor", () => {
    it("should initialize correctly", () => {
      expect(tool).toBeDefined();
    });

    it("should have correct tool name", () => {
      expect(tool["name"]).toBe("PowerShell_Directory_Navigation");
    });

    it("should have description mentioning path calculation", () => {
      expect(tool["description"]).toBeDefined();
      expect(tool["description"]).toContain(
        "calculate the next directory path",
      );
    });

    it("should have a parameters schema", () => {
      expect(tool["parametersSchema"]).toBeDefined();
    });
  });

  describe("invoke - Success Cases", () => {
    it("should resolve an absolute target path ignoring currentPath", async () => {
      const targetPath = "C:\\Users\\test";
      const result = await tool.invoke({
        path: targetPath,
        currentPath: "C:\\Other\\Base",
      });

      expect(result).toBeDefined();
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toBe(path.normalize(targetPath));
      expect(result.isError).toBeUndefined();
    });

    it("should resolve a relative path based on currentPath", async () => {
      const basePath = "C:\\Projects\\MyApp";
      const result = await tool.invoke({
        path: "src",
        currentPath: basePath,
      });

      expect(result.content[0].text).toBe(
        path.resolve(basePath, "src"),
      );
    });

    it("should support navigating to parent directory using ..", async () => {
      const basePath = "C:\\Projects\\MyApp\\src";
      const result = await tool.invoke({
        path: "..",
        currentPath: basePath,
      });

      expect(result.content[0].text).toBe(
        path.resolve(basePath, ".."),
      );
    });

    it("should use process.cwd() when currentPath is omitted", async () => {
      const cwd = process.cwd();
      const result = await tool.invoke({
        path: ".",
      });

      expect(result.content[0].text).toBe(path.resolve(cwd, "."));
    });

    it("should use process.cwd() when currentPath is null", async () => {
      const cwd = process.cwd();
      const result = await tool.invoke({
        path: "subfolder",
        currentPath: null,
      });

      expect(result.content[0].text).toBe(
        path.resolve(cwd, "subfolder"),
      );
    });

    it("should return properly formatted CallToolResult", async () => {
      const result: CallToolResult = await tool.invoke({
        path: "C:\\temp",
        currentPath: "C:\\base",
      });

      expect(result).toHaveProperty("content");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(typeof result.content[0].text).toBe("string");
    });
  });

  describe("invoke - Error Cases", () => {
    it("should return error result when path resolution throws an error", async () => {
      const spy = vi
        .spyOn(path, "resolve")
        .mockImplementation(() => {
          throw new Error("boom");
        });

      const result = await tool.invoke({
        path: "relative",
        currentPath: "C:\\base",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        "Error while resolving directory navigation path",
      );
      expect(result.content[0].text).toContain("boom");

      spy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should handle paths with special characters", async () => {
      const basePath = "C:\\Users";
      const target = "test$folder\\(backup)";

      const result = await tool.invoke({
        path: target,
        currentPath: basePath,
      });

      expect(result.content[0].text).toBe(
        path.resolve(basePath, target),
      );
    });

    it("should handle very long path strings", async () => {
      const basePath = "C:\\";
      const longRelative = "very\\".repeat(50) + "long\\path";

      const result = await tool.invoke({
        path: longRelative,
        currentPath: basePath,
      });

      expect(result.content[0].text).toBe(
        path.resolve(basePath, longRelative),
      );
    });

    it("should handle paths with unicode characters", async () => {
      const basePath = "C:\\Users\\test";
      const unicodePath = "文件夹";

      const result = await tool.invoke({
        path: unicodePath,
        currentPath: basePath,
      });

      expect(result.content[0].text).toBe(
        path.resolve(basePath, unicodePath),
      );
    });

    it("should handle consecutive navigations reliably", async () => {
      const basePath = "C:\\a";

      const res1 = await tool.invoke({
        path: basePath,
        currentPath: "C:\\",
      });
      const res2 = await tool.invoke({
        path: "..",
        currentPath: res1.content[0].text,
      });
      const res3 = await tool.invoke({
        path: "b",
        currentPath: res2.content[0].text,
      });

      expect(res1.isError).toBeUndefined();
      expect(res2.isError).toBeUndefined();
      expect(res3.isError).toBeUndefined();
    });
  });
});
