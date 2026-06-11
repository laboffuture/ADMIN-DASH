// CLAWD — the hub's resident agent (full plan: agent/ARCHITECTURE.md).
// Two brains: with ANTHROPIC_API_KEY set it asks Claude (live hub context in
// the prompt); without a key — or on any API failure — a rule-based local
// brain answers from the same context. The hub never depends on the API.
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-fable-5';

const SYSTEM = [
  'You are Clawd, the small resident agent living inside ADMIN-LINK, the LOF company admin hub.',
  'Answer ONLY from the CONTEXT JSON (live module statuses, latencies, FX rates).',
  'Be friendly and brief — two or three short sentences, plain text, no markdown.',
  'If asked something the context cannot answer, say so honestly.',
].join(' ');

function createAgent({ getProjects, getStatuses, getRates, apiKey, fetchFn = fetch, model = MODEL } = {}) {
  function context() {
    return {
      now: new Date().toISOString(),
      projects: (getProjects && getProjects()) || [],
      statuses: (getStatuses && getStatuses()) || {},
      rates: (getRates && getRates()) || null,
    };
  }

  function localReply(message, ctx) {
    const q = String(message || '').toLowerCase();
    const rows = ctx.projects.map((p) => ({ p, st: ctx.statuses[p.id] || { status: 'unknown' } }));
    const online = rows.filter((r) => r.st.status === 'online');
    const trouble = rows.filter((r) => r.st.status === 'down' || r.st.status === 'error');
    const pending = rows.filter((r) => r.st.status === 'pending');

    const named = rows.find((r) => q.includes(r.p.id.toLowerCase()) || q.includes(r.p.name.toLowerCase()));
    if (named) {
      const { p, st } = named;
      if (st.status === 'online') return `${p.name} is online${st.latencyMs != null ? ` and answering in ${st.latencyMs}ms` : ''}. All good there.`;
      if (st.status === 'pending') return `${p.name} isn't connected yet — it has no URL in the registry. It lights up the moment its host is added to projects.json.`;
      if (st.status === 'down') return `${p.name} is not responding right now — worth a look.`;
      if (st.status === 'error') return `${p.name} is up but answering with server errors (5xx) — worth a look.`;
      return `${p.name}: still checking, I don't have a status yet.`;
    }

    if (ctx.rates && /(rate|currency|aed|usd|inr|dollar|dirham|rupee|conver)/.test(q)) {
      return `Right now 1 AED = ₹${ctx.rates.aedInr.toFixed(2)} and 1 USD = ₹${ctx.rates.usdInr.toFixed(2)}.`;
    }

    const lines = [`${online.length} of ${rows.length} modules online.`];
    if (trouble.length) lines.push(`Trouble: ${trouble.map((r) => r.p.name).join(', ')}.`);
    if (pending.length) lines.push(`${pending.length} ${pending.length === 1 ? 'placeholder is' : 'placeholders are'} waiting to be connected.`);
    if (online.length) lines.push(`Healthy: ${online.map((r) => `${r.p.name}${r.st.latencyMs != null ? ` (${r.st.latencyMs}ms)` : ''}`).join(', ')}.`);
    return lines.join(' ');
  }

  async function chat(message) {
    const ctx = context();
    if (apiKey) {
      try {
        const res = await fetchFn(ANTHROPIC_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 400,
            system: SYSTEM,
            messages: [{ role: 'user', content: `CONTEXT:\n${JSON.stringify(ctx)}\n\nQUESTION: ${message}` }],
          }),
        });
        if (res.ok) {
          const body = await res.json();
          const text = (body.content || [])
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('\n')
            .trim();
          if (text) return { reply: text, source: 'claude' };
        }
      } catch {
        // fall through to the local brain
      }
    }
    return { reply: localReply(message, ctx), source: 'local' };
  }

  return { chat, localReply, context };
}

module.exports = { createAgent };
