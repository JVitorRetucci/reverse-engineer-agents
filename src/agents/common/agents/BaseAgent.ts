import { CompiledStateGraph } from "@langchain/langgraph";

export abstract class BaseAgent<T> {
  protected colorCode: string = "\x1b[31m";
  protected nodes: Record<string, (state: T) => T | Promise<T>> = {};

  protected readonly MAX_ITERATIONS = parseInt(
    process.env.MAX_AGENT_ITERATIONS ?? "5",
    10
  );

  protected printDebugMessage(str: string): void {
    if (process.env.DEBUG_MODE === "true")
      console.log(`${this.colorCode}[${this.constructor.name}]\x1b[0m ` + str);
  }

  protected setNodes(
    nodes: Record<string, (state: T) => T | Promise<T>>
  ): void {
    this.nodes = nodes;
  }

  public async getNewAgentInstance() {
    return await this.compileGraph();
  }

  protected abstract compileGraph(): Promise<
    CompiledStateGraph<T, T, string | "__start__">
  >;

  protected abstract pathRouter(state: T): string;
}
