import { describe, it, expect } from 'vitest';
import { createPoller } from '../poller.js';

const projects = [
  { id: 'a', name: 'A', adminUrl: 'http://x/admin', healthUrl: 'http://x/health' },
  { id: 'b', name: 'B', adminUrl: 'http://y/admin' },
];

const okFetch = async () => ({ status: 200 });
const errFetch = async () => ({ status: 503 });
const downFetch = async () => { throw new Error('ECONNREFUSED'); };
const hangingFetch = (url, { signal }) =>
  new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  });

describe('createPoller', () => {
  it('starts with no statuses', () => {
    const poller = createPoller(() => projects, { fetchFn: okFetch });
    expect(poller.getStatuses()).toEqual({});
  });

  it('marks 2xx responses online with a latency', async () => {
    const poller = createPoller(() => projects, { fetchFn: okFetch });
    const statuses = await poller.checkAll();
    expect(statuses.a.status).toBe('online');
    expect(statuses.a.httpStatus).toBe(200);
    expect(typeof statuses.a.latencyMs).toBe('number');
    expect(typeof statuses.a.lastChecked).toBe('string');
    expect(statuses.b.status).toBe('online');
  });

  it('marks 4xx online (server responded) and 5xx as error', async () => {
    const poller404 = createPoller(() => projects, { fetchFn: async () => ({ status: 404 }) });
    expect((await poller404.checkAll()).a.status).toBe('online');

    const poller503 = createPoller(() => projects, { fetchFn: errFetch });
    expect((await poller503.checkAll()).a.status).toBe('error');
  });

  it('marks network failures down', async () => {
    const poller = createPoller(() => projects, { fetchFn: downFetch });
    const statuses = await poller.checkAll();
    expect(statuses.a).toMatchObject({ status: 'down', httpStatus: null, latencyMs: null });
  });

  it('aborts slow checks after timeoutMs and marks them down', async () => {
    const poller = createPoller(() => projects, { fetchFn: hangingFetch, timeoutMs: 50 });
    const statuses = await poller.checkAll();
    expect(statuses.a.status).toBe('down');
    expect(statuses.b.status).toBe('down');
  });

  it('checks healthUrl when present, otherwise adminUrl', async () => {
    const seen = [];
    const spyFetch = async (url) => { seen.push(url); return { status: 200 }; };
    await createPoller(() => projects, { fetchFn: spyFetch }).checkAll();
    expect(seen).toContain('http://x/health');
    expect(seen).toContain('http://y/admin');
  });
});
