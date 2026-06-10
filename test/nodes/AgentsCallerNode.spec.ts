import { describe, it, expect, vi } from 'vitest';
import { AgentsCallerNode } from '../../src/agents/main/nodes/AgentsCallerNode';
import { AIMessage, ToolMessage } from '@langchain/core/messages';

const mockAppend = vi.fn();

vi.mock('@agents/common/nodes/Node.js', () => ({ Node: class {} }));
vi.mock('@a2a-js/sdk/client', () => ({ A2AClient: { fromCardUrl: async () => ({ sendMessage: async () => ({ result: { parts: [{ kind: 'text', text: 'ok' }] } } ) }) } }));
vi.mock('@agents/common/store/ConversationStore.js', () => ({ default: { init: () => ({ appendMessages: mockAppend }) }, }));

describe('AgentsCallerNode persistence', () => {
  it('persists agent responses when contextId present', async () => {
    const node = new AgentsCallerNode({ agents: { 'a1': 'http://x' } });

    const aiMsg: any = new AIMessage('resp');
    // attach tool_calls
    (aiMsg as any).tool_calls = [{ id: 't1', name: 'a1', args: {} }];

    const state: any = { contextId: 'ctx1', messages: [aiMsg] };

    const res = await node.execute(state);
    expect(mockAppend).toHaveBeenCalled();
  });
});
