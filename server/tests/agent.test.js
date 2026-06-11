import { describe, it, expect, vi } from 'vitest';
import { createAgent } from '../agent.js';

const PROJECTS = [
  { id: 'coderunner', name: 'CODERUNNER', adminUrl: 'https://x/admin' },
  { id: 'qc-agent', name: 'QC AGENT' },
  { id: 'website', name: 'WEBSITE', adminUrl: 'https://y' },
];
const STATUSES = {
  coderunner: { status: 'online', latencyMs: 88 },
  'qc-agent': { status: 'pending', latencyMs: null },
  website: { status: 'down', latencyMs: null },
};
const RATES = { usdInr: 95.37, aedInr: 25.97, fetchedAt: '2026-06-11T05:00:00Z' };

function buildAgent(overrides = {}) {
  return createAgent({
    getProjects: () => PROJECTS,
    getStatuses: () => STATUSES,
    getRates: () => RATES,
    ...overrides,
  });
}

describe('createAgent — local brain (no API key)', () => {
  it('answers a progress question with real counts and trouble spots', async () => {
    const { reply, source } = await buildAgent().chat('hey, how is the progress?');
    expect(source).toBe('local');
    expect(reply).toContain('1 of 3 modules online');
    expect(reply).toContain('WEBSITE');          // the down one is named
    expect(reply).toMatch(/placeholder/i);        // pending count mentioned
  });

  it('answers about a specific module when named', async () => {
    const { reply } = await buildAgent().chat('what about coderunner?');
    expect(reply).toContain('CODERUNNER');
    expect(reply).toContain('88ms');
  });

  it('explains unconnected modules', async () => {
    const { reply } = await buildAgent().chat('how is qc agent doing');
    expect(reply).toMatch(/isn't connected yet/i);
  });

  it('answers currency questions from the cached rates', async () => {
    const { reply } = await buildAgent().chat('what is the USD rate today?');
    expect(reply).toContain('95.37');
    expect(reply).toContain('25.97');
  });
});

describe('createAgent — Claude brain (API key set)', () => {
  it('asks the Anthropic API and returns its text', async () => {
    const fetchFn = vi.fn(async (url, opts) => ({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'All calm, boss.' }] }),
    }));
    const agent = buildAgent({ apiKey: 'sk-test', fetchFn });
    const { reply, source } = await agent.chat('how are we doing?');
    expect(reply).toBe('All calm, boss.');
    expect(source).toBe('claude');
    const [url, opts] = fetchFn.mock.calls[0];
    expect(url).toContain('api.anthropic.com');
    expect(opts.headers['x-api-key']).toBe('sk-test');
    expect(opts.body).toContain('coderunner');     // live context shipped to the model
  });

  it('falls back to the local brain when the API call fails', async () => {
    const fetchFn = vi.fn(async () => { throw new Error('network'); });
    const { reply, source } = await buildAgent({ apiKey: 'sk-test', fetchFn }).chat('status?');
    expect(source).toBe('local');
    expect(reply).toContain('1 of 3 modules online');
  });
});
