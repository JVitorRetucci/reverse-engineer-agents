import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocks to avoid heavy imports when loading the executor module
vi.mock('@agents/common/llmServices/factories/DefaultLLMServiceFactory.js', () => ({
  DefaultLLMServiceFactory: class { create() { return { invoke: async () => ({}) }; } },
}));
vi.mock('@agents/common/mcpClients/mcpAdapter.js', () => ({
  MCPClientsAdapter: { getMultipleClientsConnection: () => ({ getTools: async () => [] }) },
}));
vi.mock('@agents/main/agent.js', () => ({ MainAgent: class { constructor(){} async getNewAgentInstance(){ return null } } }));
vi.mock('@agents/main/nodes/AgentsCallerNode.js', () => ({ AgentsCallerNode: class {} }));
vi.mock('@agents/main/nodes/LLMCallerNode.js', () => ({ LLMCallerNode: class {} }));
vi.mock('@agents/main/nodes/ToolsNode.js', () => ({ ToolsNode: class {} }));
// Use the real ConversationStore implementation for tests
vi.mock('@agents/common/store/ConversationStore.js', async () => {
  return await import('../../src/agents/common/store/ConversationStore');
});

import { MainAgentExecutor } from '../../src/agents/main/executor';
import ConversationStore from '../../src/agents/common/store/ConversationStore';
import { AIMessage } from '@langchain/core/messages';

describe('MainAgentExecutor integration (light)', () => {
  it('loads history and appends new messages', async () => {
    const exec = new MainAgentExecutor();
    // override store with in-memory
    // @ts-ignore
    exec.conversationStore = ConversationStore.init(':memory:');

    // stub agent to avoid full graph init
    // @ts-ignore
    exec.agent = {
      invoke: async (state: any) => {
        return { messages: [new AIMessage('automated-reply')] } as any;
      },
    };

    const published: any[] = [];
    const eventBus = {
      publish: (m: any) => published.push(m),
      finished: () => {},
    } as any;

    const requestContext: any = {
      contextId: 'test-convo-1',
      userMessage: {
        parts: [{ kind: 'text', text: 'hello' }],
        role: 'user',
      },
    };

    await exec.execute(requestContext, eventBus);

    const history = exec.conversationStore.loadHistory('test-convo-1', { window: 10 });
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[history.length - 1].content).toContain('automated-reply');
  });
});
