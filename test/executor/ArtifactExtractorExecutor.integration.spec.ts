import { describe, it, expect, vi } from 'vitest';

vi.mock('@agents/common/llmServices/factories/DefaultLLMServiceFactory.js', () => ({
  DefaultLLMServiceFactory: class { create() { return { invoke: async () => ({}) }; } },
}));
vi.mock('@agents/common/mcpClients/mcpAdapter.js', () => ({
  MCPClientsAdapter: { getMultipleClientsConnection: () => ({ getTools: async () => [] }) },
}));
vi.mock('../../src/agents/artifactExtractor/agent.js', () => ({
  ArtifactExtractorAgent: class { constructor() {} async getNewAgentInstance() { return null; } },
}));
vi.mock('../../src/agents/artifactExtractor/nodes/AgentsCallerNode.js', () => ({
  AgentsCallerNode: class {},
}));
vi.mock('../../src/agents/artifactExtractor/nodes/LLMCallerNode.js', () => ({
  LLMCallerNode: class {},
}));
vi.mock('../../src/agents/artifactExtractor/nodes/ToolsNode.js', () => ({
  ToolsNode: class {},
}));

import { ArtifactExtractorAgentExecutor } from '../../src/agents/artifactExtractor/executor';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

describe('ArtifactExtractorAgentExecutor integration (light)', () => {
  it('falls back to the latest non-empty message when the final message is empty', async () => {
    const exec = new ArtifactExtractorAgentExecutor();

    // @ts-ignore
    exec.agent = {
      invoke: async () => ({
        messages: [new HumanMessage('user input'), new AIMessage('')],
      }),
    };

    const published: any[] = [];
    const eventBus = {
      publish: (m: any) => published.push(m),
      finished: () => {},
    } as any;

    const requestContext: any = {
      contextId: 'artifact-test',
      userMessage: {
        parts: [{ kind: 'text', text: 'hello' }],
        role: 'user',
      },
    };

    await exec.execute(requestContext, eventBus);

    expect(published).toHaveLength(1);
    expect(published[0].parts[0].data.content).toBe('user input');
    expect(published[0].parts[0].data.content).not.toBe('');
  });
});
