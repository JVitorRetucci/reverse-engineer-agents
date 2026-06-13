import { describe, it, expect } from 'vitest';
import { AIMessage, ToolMessage, HumanMessage } from '@langchain/core/messages';
import { normalizeLLMResponse } from '../../../../src/agents/common/llmServices/LLMResponseNormalizer';

describe('LLMResponseNormalizer', () => {
  it('returns an AIMessage when input is a string', () => {
    const response = normalizeLLMResponse('hello world');

    expect(response).toBeInstanceOf(AIMessage);
    expect(response.content).toBe('hello world');
  });

  it('returns the same message instance when input is already a BaseMessage', () => {
    const original = new AIMessage('existing');
    const response = normalizeLLMResponse(original);

    expect(response).toBe(original);
    expect(response.content).toBe('existing');
  });

  it('normalizes OpenAI-like response objects to AIMessage', () => {
    const rawResponse = {
      type: 'ai',
      role: 'assistant',
      content: [{ type: 'text', text: 'normalized content' }],
    };

    const response = normalizeLLMResponse(rawResponse as any);

    expect(response).toBeInstanceOf(AIMessage);
    expect(response.content).toEqual([{ type: 'text', text: 'normalized content' }]);
    expect(response._getType()).toBe('ai');
  });

  it('preserves tool_calls from tool responses', () => {
    const rawResponse = {
      type: 'tool',
      role: 'assistant',
      content: '{}',
      tool_calls: [{ id: 'call1', name: 'toolA', args: { q: 'x' } }],
    };

    const response = normalizeLLMResponse(rawResponse as any);

    expect(response).toBeInstanceOf(AIMessage);
    expect((response as any).tool_calls).toEqual([
      { id: 'call1', name: 'toolA', args: { q: 'x' } },
    ]);
  });

  it('normalizes raw assistant response objects without tool calls', () => {
    const rawResponse = {
      type: 'assistant',
      role: 'assistant',
      content: 'simple string output',
    };

    const response = normalizeLLMResponse(rawResponse as any);

    expect(response).toBeInstanceOf(AIMessage);
    expect(response.content).toBe('simple string output');
  });
});
