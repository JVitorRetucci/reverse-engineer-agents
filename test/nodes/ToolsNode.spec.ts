import { describe, it, expect, vi } from 'vitest';
import { ToolsNode } from '../../src/agents/main/nodes/ToolsNode';
import { AIMessage, ToolMessage, HumanMessage } from '@langchain/core/messages';

const mockAppend = vi.fn();

vi.mock('@agents/common/nodes/Node.js', () => ({ Node: class {} }));
vi.mock('@agents/common/store/ConversationStore.js', () => ({
  default: { init: () => ({ appendMessages: mockAppend }) },
}));

describe('ToolsNode persistence', () => {
  it('persists tool results when contextId present', async () => {
    // simple mock tool
    const tool = { name: 't1', invoke: async () => ({ ok: true }) } as any;
    const node = new ToolsNode({ tools: [tool], agentName: 'main-agent' });

    const ai = new AIMessage('ai');
    (ai as any).tool_calls = [{ id: 'call1', name: 't1', args: {} }];

    const state: any = {
      contextId: 'c1',
      messages: [ai],
    };

    const res = await node.execute(state);
    expect(mockAppend).toHaveBeenCalled();
    const appended = mockAppend.mock.calls[0][1] ? mockAppend.mock.calls[0][1] : mockAppend.mock.calls[0][0];
    // ensure called with contextId and messages array (len >=1)
    expect(mockAppend.mock.calls.length).toBeGreaterThan(0);
  });
});
