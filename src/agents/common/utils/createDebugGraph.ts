import { CompiledStateGraph } from "@langchain/langgraph";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export default async function createDebugGraph(graphName: string, agent: CompiledStateGraph<any, any, any, any, any, any, any, any, any>) {
  if (process.env.DEBUG_MODE !== 'true') return;

  const graph = await agent.getGraphAsync();
  const blob = await graph.drawMermaidPng();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const debugGraphPath = process.env.DEBUG_GRAPH_PATH;
  
  if (!debugGraphPath) {
    console.warn('DEBUG_GRAPH_PATH is not defined. Skipping debug graph creation.');
    return;
  }

  // Check if directory exists, if not, create it recursively
  if (!existsSync(debugGraphPath)) {
    console.log(`Directory ${debugGraphPath} does not exist. Creating...`);
    try {
      mkdirSync(debugGraphPath, { recursive: true });
      console.log(`Directory ${debugGraphPath} created successfully.`);
    } catch (error) {
      console.error(`Error creating directory ${debugGraphPath}:`, error);
      return;
    }
  }
  
  const filePath = join(debugGraphPath, `${graphName}.png`);
  console.log(`Creating file "${graphName}.png" at ${debugGraphPath}...`);
  
  try {
    writeFileSync(filePath, buffer);
    console.log(`File created successfully at ${filePath}`);
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
  }
}