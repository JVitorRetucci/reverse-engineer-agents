import "dotenv/config";
import { AgentRegistry } from "@core/AgentRegistry.js";

async function main() {
  const registry = new AgentRegistry("agents.config.json");

  try {
    await registry.startAllAgents();

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\n⏸ Shutting down agents...");
      await registry.stopAllAgents();
      process.exit(0);
    });
  } catch (err) {
    console.error("Failed to start agents:", err);
    process.exit(1);
  }
}

main();
