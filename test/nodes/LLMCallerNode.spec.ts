import { describe, it, expect, vi } from 'vitest';

// Mock base Node class to allow importing LLMCallerNode without full project wiring
vi.mock('@agents/common/nodes/Node.js', () => ({ Node: class {} }));

import { LLMCallerNode } from '../../src/agents/main/nodes/LLMCallerNode';
import { AgentState } from '../../src/agents/common/states/AgentState';
import { BaseMessage, HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';

describe('LLMCallerNode', () => {
  it('uses systemPromptVersion when present and windows history', async () => {
    const invokedWith: any[] = [];
    const mockLLM = {
      invoke: async (params: BaseMessage[]) => {
        invokedWith.push(params);
        return new AIMessage('ok');
      },
    } as any;

    const node = new LLMCallerNode(mockLLM, 2);

    const state: AgentState = {
      messages: [new HumanMessage('m1'), new HumanMessage('m2'), new HumanMessage('m3')],
      systemPromptVersion: 'v1',
    } as any;

    const newState = await node.execute(state);
    expect(invokedWith.length).toBe(1);
    const params = invokedWith[0];
    // first param should be SystemMessage with version marker
    expect((params[0] as SystemMessage).content).toContain('SystemPromptVersion:v1');
    // history window size is 2, so only last 2 messages passed
    expect(params.length).toBe(1 + 2); // system + 2 history
    expect(newState.messages[newState.messages.length - 1]).toBeInstanceOf(AIMessage);
  });

  it('falls back to full PROMPT_TEMPLATE when no version', async () => {
    const invokedWith: any[] = [];
    const mockLLM = {
      invoke: async (params: BaseMessage[]) => {
        invokedWith.push(params);
        return new AIMessage('ok');
      },
    } as any;

    const node = new LLMCallerNode(mockLLM, 5);

    const state: AgentState = {
      messages: [new HumanMessage('only')],
    } as any;

    await node.execute(state);
    const params = invokedWith[0];
    expect((params[0] as SystemMessage).content.length).toBeGreaterThan(10);
    expect(params.length).toBe(2); // system + 1 message
  });

  it('marks an initial chat turn as FIRST_RESPONSE', async () => {
    const invokedWith: BaseMessage[][] = [];
    const mockLLM = {
      invoke: async (params: BaseMessage[]) => {
        invokedWith.push(params);
        return new AIMessage('ok');
      },
    } as any;

    const node = new LLMCallerNode(mockLLM, 5);
    await node.execute({
      messages: [new HumanMessage('new chat')],
      isFirstResponse: true,
    } as AgentState);

    expect((invokedWith[0][0] as SystemMessage).content)
      .toContain('CONVERSATION_PHASE:FIRST_RESPONSE');
  });

  it('marks a chat with history as CONTINUATION', async () => {
    const invokedWith: BaseMessage[][] = [];
    const mockLLM = {
      invoke: async (params: BaseMessage[]) => {
        invokedWith.push(params);
        return new AIMessage('ok');
      },
    } as any;

    const node = new LLMCallerNode(mockLLM, 5);
    await node.execute({
      messages: [
        new HumanMessage('first question'),
        new AIMessage('first answer'),
        new HumanMessage('follow-up'),
      ],
      isFirstResponse: false,
    } as AgentState);

    expect((invokedWith[0][0] as SystemMessage).content)
      .toContain('CONVERSATION_PHASE:CONTINUATION');
  });
});
