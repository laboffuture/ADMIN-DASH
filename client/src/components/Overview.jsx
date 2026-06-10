const STATUS_LABEL = {
  online: 'ONLINE',
  error: 'ERRORS',
  down: 'DOWN',
  pending: 'NOT CONNECTED',
  unknown: 'CHECKING…',
};

export function Overview({ projects, statuses, onSelect }) {
  const onlineCount = projects.filter((p) => statuses[p.id] && statuses[p.id].status === 'online').length;

  return (
    <main className="overview">
      <header className="overview-head">
        <h2>ALL MODULES</h2>
        <p>{onlineCount} of {projects.length} online</p>
      </header>
      <div className="overview-grid">
        {projects.map((p) => {
          const st = statuses[p.id];
          const state = st ? st.status : 'unknown';
          return (
            <button
              key={p.id}
              className={`module-card ${state === 'pending' ? 'module-card-pending' : ''}`}
              onClick={() => onSelect(p.id)}
              style={p.accent ? { '--accent': p.accent } : undefined}
            >
              <span className="module-chip" aria-hidden="true">{p.name.charAt(0)}</span>
              <span className="module-card-name">{p.name}</span>
              <span className="module-card-desc">{p.description}</span>
              <span className="module-card-status">
                <span className={`dot dot-${state}`} />
                <span className="module-card-state">{STATUS_LABEL[state]}</span>
                {st && st.latencyMs != null && <span className="latency">{st.latencyMs}ms</span>}
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
