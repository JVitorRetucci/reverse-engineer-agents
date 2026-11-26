import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { DEFAULT_A2A_TIMEOUT_MS } from "../../../../src/agents/common/utils/a2aClientFactory.js";
import { createA2AClientWithTimeout } from "../../../../src/agents/common/utils/a2aClientFactory.js";

function waitForServerPort(server: ReturnType<typeof createServer>): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();

      if (address && typeof address === "object") {
        resolve(address.port);
        return;
      }

      reject(new Error("Could not determine server port"));
    });
  });
}

describe("createA2AClientWithTimeout integration", () => {
  it("waits the configured 30 minutes before aborting a hung request", async () => {
    const server = createServer((_req, res) => {
      // Keep the request open without sending headers so the helper timeout is the only escape hatch.
      void res;
    });

    try {
      const port = await waitForServerPort(server);
      const timeoutMs = DEFAULT_A2A_TIMEOUT_MS;
      const startedAt = Date.now();

      const requestPromise = createA2AClientWithTimeout(
        `http://127.0.0.1:${port}/.well-known/agent-card.json`,
        timeoutMs,
      ).catch((error: unknown) => error);
      const result = await requestPromise;

      const elapsedMs = Date.now() - startedAt;

      expect(result).toMatchObject({ name: "AbortError" });
      expect(elapsedMs).toBeGreaterThanOrEqual(timeoutMs);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, DEFAULT_A2A_TIMEOUT_MS + 10_000);
});