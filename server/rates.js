// Fetches USD-based FX rates (open.er-api.com, keyless) and caches the two
// pairs the topbar shows: AED→INR and USD→INR. The provider updates daily,
// so an hourly refresh is plenty. Failures keep the last good rates.
const RATES_URL = 'https://open.er-api.com/v6/latest/USD';

function createRates({ url = RATES_URL, intervalMs = 60 * 60 * 1000, timeoutMs = 5000, fetchFn = fetch } = {}) {
  let rates = null;
  let timer = null;

  async function refresh() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchFn(url, { signal: controller.signal });
      if (!res.ok) return rates;
      const body = await res.json();
      const inr = body && body.rates ? Number(body.rates.INR) : NaN;
      const aed = body && body.rates ? Number(body.rates.AED) : NaN;
      if (!Number.isFinite(inr) || !Number.isFinite(aed) || inr <= 0 || aed <= 0) return rates;
      rates = { usdInr: inr, aedInr: inr / aed, fetchedAt: new Date().toISOString() };
    } catch {
      // network failure — keep last good rates
    } finally {
      clearTimeout(timeout);
    }
    return rates;
  }

  function getRates() {
    return rates;
  }

  function start() {
    if (timer) return;
    refresh();
    timer = setInterval(refresh, intervalMs);
    if (timer.unref) timer.unref();
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  return { refresh, getRates, start, stop };
}

module.exports = { createRates };
