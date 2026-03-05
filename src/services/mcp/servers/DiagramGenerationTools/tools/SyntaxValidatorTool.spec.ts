import { describe, it, expect, beforeEach } from "vitest";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { SyntaxValidatorTool } from "./SyntaxValidatorTool.js";

describe("SyntaxValidatorTool", () => {
  let tool: SyntaxValidatorTool;

  beforeEach(() => {
    tool = new SyntaxValidatorTool();
  });

  describe("Constructor", () => {
    it("should initialize correctly", () => {
      expect(tool).toBeDefined();
    });

    it("should have correct tool name", () => {
      expect(tool["name"]).toBe("Mermaid_syntax_validator_tool");
    });

    it("should have description mentioning Mermaid validation", () => {
      expect(tool["description"]).toBeDefined();
      expect(tool["description"]).toContain(
        "validate the syntax of a Mermaid diagram",
      );
    });

    it("should have a parameters schema", () => {
      expect(tool["parametersSchema"]).toBeDefined();
    });
  });

  describe("invoke - Valid Diagram Cases", () => {
    it("should validate a simple flowchart diagram", async () => {
      const diagram = "graph TD\n  A[Start] --> B[End]";
      const result = await tool.invoke({
        generatedDiagram: diagram,
      });

      expect(result).toBeDefined();
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toBe("OK");
      expect(result.isError).toBeUndefined();
    });

    it("should validate a sequence diagram", async () => {
      const diagram = "sequenceDiagram\n  participant A\n  participant B\n  A->>B: Hello";
      const result = await tool.invoke({
        generatedDiagram: diagram,
      });

      expect(result.content[0].text).toBe("OK");
      expect(result.isError).toBeUndefined();
    });

    it("should validate a class diagram", async () => {
      const diagram = "classDiagram\n  class Animal\n  Animal : name";
      const result = await tool.invoke({
        generatedDiagram: diagram,
      });

      expect(result.content[0].text).toBe("OK");
      expect(result.isError).toBeUndefined();
    });

    it("should validate a state diagram", async () => {
      const diagram = "stateDiagram-v2\n  [*] --> State1\n  State1 --> [*]";
      const result = await tool.invoke({
        generatedDiagram: diagram,
      });

      expect(result.content[0].text).toBe("OK");
      expect(result.isError).toBeUndefined();
    });

    it("should return properly formatted CallToolResult on success", async () => {
      const diagram = "graph LR\n  A --> B";
      const result: CallToolResult = await tool.invoke({
        generatedDiagram: diagram,
      });

      expect(result).toHaveProperty("content");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(typeof result.content[0].text).toBe("string");
    });
  });

  describe("invoke - Invalid Diagram Cases", () => {
    it("should return error for diagram with unclosed bracket", async () => {
      const diagram = "graph TD\n  A[Start --> B[End";
      const result = await tool.invoke({
        generatedDiagram: diagram,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        "Mermaid syntax validation failed",
      );
    });

    it("should return error for invalid diagram type", async () => {
      const diagram = "invalidDiagram\n  A --> B";
      const result = await tool.invoke({
        generatedDiagram: diagram,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        "Mermaid syntax validation failed",
      );
    });

    it("should return error for malformed syntax", async () => {
      const diagram = "graph TD\n  A -->-- B";
      const result = await tool.invoke({
        generatedDiagram: diagram,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        "Mermaid syntax validation failed",
      );
    });

    it("should return error result with proper format on failure", async () => {
      const diagram = "graph TD\n  A[incomplete";
      const result: CallToolResult = await tool.invoke({
        generatedDiagram: diagram,
      });

      expect(result).toHaveProperty("content");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(result.isError).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty diagram string", async () => {
      const result = await tool.invoke({
        generatedDiagram: "",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        "Mermaid syntax validation failed",
      );
    });

    it("should handle diagram with extra whitespace", async () => {
      const diagram = "  graph TD  \n  A[Start]  \n  B[End]  ";
      const result = await tool.invoke({
        generatedDiagram: diagram,
      });

      expect(result.content[0].text).toBe("OK");
    });

    it("should handle diagram with newline variations", async () => {
      const diagram = "graph TD\r\n  A[Start]\r\n  B[End]";
      const result = await tool.invoke({
        generatedDiagram: diagram,
      });

      expect(result.content[0].text).toBe("OK");
    });

    it("should handle complex nested structures", async () => {
      const diagram = 
        "graph TD\n" +
        "  A[\"Complex Label<br/>With Newlines\"] --> B\n" +
        "  B --> C{Decision}\n" +
        "  C -->|Yes| D[Action 1]\n" +
        "  C -->|No| E[Action 2]";
      const result = await tool.invoke({
        generatedDiagram: diagram,
      });

      expect(result.content[0].text).toBe("OK");
    });

    it("should handle multiple consecutive invocations reliably", async () => {
      const validDiagram = "graph TD\n  A --> B";
      const invalidDiagram = "graph TD\n  A ---->";

      const res1 = await tool.invoke({
        generatedDiagram: validDiagram,
      });
      const res2 = await tool.invoke({
        generatedDiagram: invalidDiagram,
      });
      const res3 = await tool.invoke({
        generatedDiagram: validDiagram,
      });

      expect(res1.content[0].text).toBe("OK");
      expect(res2.isError).toBe(true);
      expect(res3.content[0].text).toBe("OK");
    });
  });
});
