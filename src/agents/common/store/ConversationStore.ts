import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { dirname, join } from 'path';

export type StoredMessage = {
  msg_id?: string;
  role: string;
  content: string;
  timestamp?: number;
};

type InternalConvo = {
  id: string;
  messages: StoredMessage[];
  summary?: string;
  updated_at?: number;
};

export class ConversationStore {
  basePath: string | null;
  memStore: Map<string, InternalConvo> | null = null;

  private constructor(basePath: string | null, inMemory = false) {
    this.basePath = basePath;
    if (inMemory) this.memStore = new Map();
  }

  static init(dbPath: string | null = 'data/conversations') {
    if (dbPath === ':memory:') return new ConversationStore(null, true);
    const dir = dirname(dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (!existsSync(dbPath)) mkdirSync(dbPath, { recursive: true });
    return new ConversationStore(dbPath, false);
  }

  private convoFile(convoId: string) {
    if (!this.basePath) throw new Error('ConversationStore is in-memory');
    return join(this.basePath, `${encodeURIComponent(convoId)}.json`);
  }

  private loadConvo(convoId: string): InternalConvo {
    if (this.memStore) {
      if (!this.memStore.has(convoId)) this.memStore.set(convoId, { id: convoId, messages: [] });
      return this.memStore.get(convoId)!;
    }
    const file = this.convoFile(convoId);
    if (!existsSync(file)) return { id: convoId, messages: [] };
    const raw = readFileSync(file, 'utf8');
    try {
      return JSON.parse(raw) as InternalConvo;
    } catch (e) {
      return { id: convoId, messages: [] };
    }
  }

  private saveConvo(convo: InternalConvo) {
    convo.updated_at = Date.now();
    if (this.memStore) {
      this.memStore.set(convo.id, convo);
      return;
    }
    const file = this.convoFile(convo.id);
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(convo, null, 2), 'utf8');
    renameSync(tmp, file);
  }

  loadHistory(convoId: string, opts: { window?: number } = {}) {
    const window = opts.window ?? 20;
    const convo = this.loadConvo(convoId);
    const msgs = convo.messages.slice(-window);
    return msgs.map(m => ({ msg_id: m.msg_id, role: m.role, content: m.content, timestamp: m.timestamp }));
  }

  appendMessages(convoId: string, messages: StoredMessage[]) {
    const convo = this.loadConvo(convoId);
    const existingHashes = new Set(convo.messages.map(m => createHash('sha256').update(m.content).digest('hex')));
    for (const m of messages) {
      const ts = m.timestamp ?? Date.now();
      const hash = createHash('sha256').update(m.content).digest('hex');
      if (existingHashes.has(hash)) continue;
      existingHashes.add(hash);
      convo.messages.push({ msg_id: m.msg_id, role: m.role, content: m.content, timestamp: ts });
    }
    this.saveConvo(convo);
  }

  getSummary(convoId: string) {
    const convo = this.loadConvo(convoId);
    return convo.summary ?? '';
  }

  compactHistory(convoId: string, keep = 20) {
    const convo = this.loadConvo(convoId);
    if (convo.messages.length > keep) {
      convo.messages = convo.messages.slice(-keep);
    }
    convo.summary = convo.messages.slice(0, 3).map(m => `${m.role}: ${m.content}`).join('\n');
    this.saveConvo(convo);
  }

  close() {
    if (this.memStore) this.memStore.clear();
  }
}

export default ConversationStore;
