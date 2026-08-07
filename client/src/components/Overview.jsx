const STATUS_LABEL = {
  online: 'ONLINE',
  error: 'ERRORS',
  down: 'DOWN',
  pending: 'NOT CONNECTED',
  unknown: 'CHECKING…',
};

// One cell per module, lit for each one answering. The sentence beside it
// carries the same number for anyone not reading the readout.
function Gauge({ lit, total }) {
  return (
    <span className="gauge" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`gauge-cell ${i < lit ? 'gauge-cell-lit' : ''}`} />
      ))}
    </span>
  );
}

export function Overview({ projects, statuses, onSelect }) {
  const onlineCount = projects.filter((p) => statuses[p.id] && statuses[p.id].status === 'online').length;

  return (
    <main className="overview">
      <header className="overview-head">
        <h2>ALL MODULES</h2>
        {projects.length > 0 && <Gauge lit={onlineCount} total={projects.length} />}
        <p>{onlineCount} of {projects.length} online</p>
      </header>
      <div className="overview-grid">
        {projects.map((p) => {
          const st = statuses[p.id];
          const state = st ? st.status : 'unknown';
          return (
            <button
              key={p.id}
              className={`module-card module-card-${state}`}
              onClick={() => onSelect(p.id)}
              style={p.accent ? { '--accent': p.accent } : undefined}
            >
              <span className="module-card-top">
                <span className="module-chip" aria-hidden="true">{p.name.charAt(0)}</span>
                <span className={`dot dot-${state}`} />
              </span>
              <span className="module-card-name">{p.name}</span>
              <span className="module-card-desc">{p.description}</span>
              <span className="module-card-status">
                <span className="module-card-state">{STATUS_LABEL[state]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
