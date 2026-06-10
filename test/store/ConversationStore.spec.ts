import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ConversationStore from '../../src/agents/common/store/ConversationStore';

describe('ConversationStore', () => {
  let store: ReturnType<typeof ConversationStore.init>;
  beforeEach(() => {
    store = ConversationStore.init(':memory:');
  });
  afterEach(() => {
    store.close();
  });

  it('inits and returns empty history', () => {
    const h = store.loadHistory('convo1', { window: 10 });
    expect(h).toEqual([]);
    expect(store.getSummary('convo1')).toEqual('');
  });

  it('appends and loads messages', () => {
    store.appendMessages('convo1', [{ role: 'user', content: 'hello' }]);
    const h = store.loadHistory('convo1', { window: 10 });
    expect(h.length).toBe(1);
    expect(h[0].content).toBe('hello');
  });

  it('deduplicates identical content', () => {
    store.appendMessages('convo1', [{ role: 'user', content: 'dup' }]);
    store.appendMessages('convo1', [{ role: 'user', content: 'dup' }]);
    const h = store.loadHistory('convo1', { window: 10 });
    expect(h.length).toBe(1);
  });

  it('compacts history and creates summary', () => {
    for (let i = 0; i < 30; i++) {
      store.appendMessages('convoX', [{ role: 'user', content: `m${i}` }]);
    }
    store.compactHistory('convoX', 20);
    const h = store.loadHistory('convoX', { window: 50 });
    expect(h.length).toBeLessThanOrEqual(20);
    const s = store.getSummary('convoX');
    expect(typeof s).toBe('string');
  });
});
