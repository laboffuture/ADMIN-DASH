import { describe, it, expect } from 'vitest';
import { createRates } from '../rates.js';

const PAYLOAD = { result: 'success', rates: { INR: 85.6, AED: 3.6725 } };
const okFetch = async () => ({ ok: true, status: 200, json: async () => PAYLOAD });

describe('createRates', () => {
  it('starts with no rates', () => {
    expect(createRates({ fetchFn: okFetch }).getRates()).toBeNull();
  });

  it('derives USD→INR and AED→INR from the USD-based payload', async () => {
    const rates = createRates({ fetchFn: okFetch });
    await rates.refresh();
    const r = rates.getRates();
    expect(r.usdInr).toBe(85.6);
    expect(r.aedInr).toBeCloseTo(85.6 / 3.6725, 4);
    expect(typeof r.fetchedAt).toBe('string');
  });

  it('keeps the last good rates when a refresh fails', async () => {
    let fail = false;
    const flaky = async () => {
      if (fail) throw new Error('network down');
      return { ok: true, status: 200, json: async () => PAYLOAD };
    };
    const rates = createRates({ fetchFn: flaky });
    await rates.refresh();
    fail = true;
    await rates.refresh();
    expect(rates.getRates()).not.toBeNull();
    expect(rates.getRates().usdInr).toBe(85.6);
  });

  it('ignores payloads missing the needed currencies', async () => {
    const bad = async () => ({ ok: true, status: 200, json: async () => ({ result: 'success', rates: { EUR: 0.9 } }) });
    const rates = createRates({ fetchFn: bad });
    await rates.refresh();
    expect(rates.getRates()).toBeNull();
  });

  it('ignores non-2xx responses', async () => {
    const err = async () => ({ ok: false, status: 503, json: async () => ({}) });
    const rates = createRates({ fetchFn: err });
    await rates.refresh();
    expect(rates.getRates()).toBeNull();
  });

  it('fetches the USD-based open endpoint', async () => {
    const seen = [];
    const spy = async (url) => { seen.push(url); return { ok: true, status: 200, json: async () => PAYLOAD }; };
    await createRates({ fetchFn: spy }).refresh();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain('/latest/USD');
  });
});
