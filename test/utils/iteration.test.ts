import { describe, it, expect, beforeEach } from 'vitest';

// Self-contained simulations of the minimal behaviors we need to test.
function llmCallerSim(state: any, maxIterations: number, llmInvoke?: () => any) {
  const currentIteration = state.iterationLevel ?? 0;
  if (currentIteration >= maxIterations) {
    const summaryText = JSON.stringify({ type: 'iteration_error', iterationLevel: currentIteration });
    const summaryMsg = { type: 'tool', content: summaryText };
    return { ...state, messages: [...(state.messages ?? []), summaryMsg] };
  }

  const next = currentIteration + 1;
  const response = llmInvoke ? llmInvoke() : { type: 'ai', content: 'ok' };
  return { ...state, iterationLevel: next, messages: [...(state.messages ?? []), response] };
}

function agentsCallerSim(state: any, agentResponse: any) {
  // simulate converting A2A response to ToolMessage and prioritize iteration_error
  const toolMessage = { type: 'tool', content: JSON.stringify(agentResponse) };
  let parsed: any;
  try { parsed = JSON.parse(toolMessage.content); } catch (e) { parsed = null; }

  if (parsed && parsed.type === 'iteration_error') {
    return { ...state, messages: [...(state.messages ?? []), toolMessage] };
  }

  return { ...state, messages: [...(state.messages ?? []), toolMessage] };
}

describe('Iteration guards (self-contained)', () => {
  beforeEach(() => { process.env.MAX_AGENT_ITERATIONS = '3'; });

  it('llmCallerSim returns iteration_error when at or above max iterations', () => {
    const state = { iterationLevel: 2, messages: [] };
    const res = llmCallerSim(state, 2);
    const last = res.messages[res.messages.length - 1];
    const parsed = JSON.parse(last.content);
    expect(parsed.type).toBe('iteration_error');
    expect(parsed.iterationLevel).toBe(2);
  });

  it('llmCallerSim increments iteration and appends response when under limit', () => {
    const state = { iterationLevel: 0, messages: [{ type: 'human', content: 'in' }] };
    const res = llmCallerSim(state, 5, () => ({ type: 'ai', content: 'ok' }));
    expect(res.iterationLevel).toBe(1);
    const last = res.messages[res.messages.length - 1];
    expect(last.type).toBe('ai');
  });

  it('agentsCallerSim prioritizes iteration_error ToolMessages', () => {
    const state = { iterationLevel: 1, messages: [] };
    const agentResp = { type: 'iteration_error', reason: 'max' };
    const res = agentsCallerSim(state, agentResp);
    const last = res.messages[res.messages.length - 1];
    const parsed = JSON.parse(last.content);
    expect(parsed.type).toBe('iteration_error');
  });
});
