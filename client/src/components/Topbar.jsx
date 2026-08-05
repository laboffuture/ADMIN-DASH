const DATE_OPTS = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };

export function Topbar() {
  const today = new Date().toLocaleDateString('en-GB', DATE_OPTS).toUpperCase();
  return (
    <header className="topbar">
      <span className="topbar-date">{today}</span>
    </header>
  );
}
