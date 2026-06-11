const DATE_OPTS = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };

export function Topbar({ rates }) {
  const today = new Date().toLocaleDateString('en-GB', DATE_OPTS).toUpperCase();
  const updated = rates ? new Date(rates.fetchedAt).toLocaleTimeString() : null;
  return (
    <header className="topbar">
      <span className="topbar-date">{today}</span>
      {rates && (
        <div className="topbar-rates" title={`exchange rates · updated ${updated} · open.er-api.com`}>
          <span className="fx-chip">
            <span className="fx-label">1 AED</span>
            <span className="fx-value">₹ {rates.aedInr.toFixed(2)}</span>
          </span>
          <span className="fx-chip">
            <span className="fx-label">1 USD</span>
            <span className="fx-value">₹ {rates.usdInr.toFixed(2)}</span>
          </span>
        </div>
      )}
    </header>
  );
}
