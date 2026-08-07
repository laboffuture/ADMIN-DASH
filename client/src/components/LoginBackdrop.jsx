// The wall behind the login panel: one continuous moulded surface with a
// scene cut into it. Four quadrants, one discipline each — computer science,
// aerospace, robotics, space — echoing the routing etched into the panel's
// own corners. No text, and the centre is masked out so the card sits on
// clean surface.

// Deterministic scatter: same starfield every render, computed once.
function scatter(count, seed) {
  const out = [];
  let s = seed;
  const next = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  for (let i = 0; i < count; i += 1) {
    out.push([+(next() * 1600).toFixed(1), +(next() * 900).toFixed(1), +(0.9 + next() * 1.7).toFixed(2)]);
  }
  return out;
}
const STARS = scatter(58, 20260806);

// A small feed-forward graph, laid out once: 3 → 4 → 2.
const NET = (() => {
  const cols = [3, 4, 2].map((n, li) =>
    Array.from({ length: n }, (_, i) => [li * 104, (i - (n - 1) / 2) * 64]),
  );
  const edges = [];
  for (let l = 0; l < cols.length - 1; l += 1) {
    for (const a of cols[l]) for (const b of cols[l + 1]) edges.push([a, b]);
  }
  return { nodes: cols.flat(), edges };
})();

export function LoginBackdrop() {
  return (
    <svg
      className="login-backdrop"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="lb-fade" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#000" />
          <stop offset="38%" stopColor="#000" />
          <stop offset="100%" stopColor="#fff" />
        </radialGradient>
        <mask id="lb-centre">
          <rect width="1600" height="900" fill="url(#lb-fade)" />
        </mask>
      </defs>

      <g
        mask="url(#lb-centre)"
        stroke="currentColor"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* ── starfield, everywhere ── */}
        <g stroke="none" fill="currentColor" opacity="0.75">
          {STARS.map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
        </g>

        {/* ── top-left: computer science — a die, its pins and routing ── */}
        <g>
          <rect x="96" y="128" width="132" height="132" rx="10" />
          <rect x="132" y="164" width="60" height="60" rx="6" />
          {[0, 1, 2].map((i) => (
            <g key={`pin-${i}`}>
              <path d={`M96 ${160 + i * 36}H56`} />
              <path d={`M228 ${160 + i * 36}h40`} />
              <path d={`M${132 + i * 36} 128V88`} />
              <path d={`M${132 + i * 36} 260v40`} />
            </g>
          ))}
          <path d="M268 160h72l40-40h108" />
          <path d="M268 232h116l44 44h96" />
          <path d="M160 300v96l48 48h140" />
          <path d="M56 196H0" />
          <g stroke="none" fill="currentColor">
            <circle cx="488" cy="120" r="6" />
            <circle cx="524" cy="276" r="6" />
            <circle cx="348" cy="444" r="6" />
          </g>
        </g>

        {/* ── top-right: aerospace — satellite on an orbital track ── */}
        <g>
          <ellipse cx="1320" cy="196" rx="300" ry="128" transform="rotate(-18 1320 196)" />
          <ellipse cx="1320" cy="196" rx="212" ry="80" transform="rotate(-18 1320 196)" opacity="0.7" />
          <g transform="translate(1300 96)">
            <rect x="-26" y="-20" width="52" height="40" rx="6" />
            <path d="M-26 0h-24M26 0h24" />
            <rect x="-104" y="-26" width="54" height="52" rx="4" />
            <rect x="50" y="-26" width="54" height="52" rx="4" />
            <path d="M-90 -26v52M-72 -26v52M64 -26v52M82 -26v52" strokeWidth="1.2" opacity="0.8" />
            <path d="M0 -20v-26" />
            <circle cx="0" cy="-52" r="7" />
          </g>
          <path d="M1064 336c96-40 196-52 300-36" strokeDasharray="10 14" opacity="0.8" />
        </g>

        {/* ── bottom-left: robotics — an articulated arm and its drive gear ── */}
        <g transform="translate(150 900)">
          <path d="M-40 -34h180" strokeWidth="4" />
          <rect x="-6" y="-104" width="92" height="70" rx="8" />
          <circle cx="40" cy="-104" r="16" />
          <path d="M40 -104 184 -246" strokeWidth="5" />
          <circle cx="184" cy="-246" r="14" />
          <path d="M184 -246 214 -404" strokeWidth="5" />
          <circle cx="214" cy="-404" r="12" />
          <g transform="translate(214 -404)">
            <path d="M0 0 44 -40" strokeWidth="4" />
            <path d="M44 -40 74 -26M44 -40 62 -70" strokeWidth="3" />
          </g>
          {/* drive gear */}
          <g transform="translate(-96 -150)">
            <circle r="46" />
            <circle r="18" />
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i * Math.PI * 2) / 10;
              return (
                <path
                  key={`tooth-${i}`}
                  d={`M${(Math.cos(a) * 46).toFixed(1)} ${(Math.sin(a) * 46).toFixed(1)}L${(Math.cos(a) * 60).toFixed(1)} ${(Math.sin(a) * 60).toFixed(1)}`}
                  strokeWidth="6"
                />
              );
            })}
          </g>
        </g>

        {/* ── bottom-right: space — a planet limb, its rings, a rocket climbing out ── */}
        <g>
          <circle cx="1420" cy="820" r="240" />
          <ellipse cx="1420" cy="820" rx="360" ry="86" transform="rotate(-22 1420 820)" />
          <path d="M1216 694a240 240 0 0 0 118 176" opacity="0.65" />
          <path d="M1256 900a240 240 0 0 0 300-104" opacity="0.65" />
          <path d="M900 900c72-150 210-262 384-318" strokeDasharray="12 16" opacity="0.85" />
          <g transform="translate(1284 582) rotate(-32)">
            <path d="M0 -46c16 20 24 44 24 70l-24 18-24-18c0-26 8-50 24-70Z" />
            <path d="M-24 30-46 62l22-6M24 30l22 32-22-6" />
            <circle cx="0" cy="6" r="10" />
            <path d="M-12 42 0 74l12-32" opacity="0.8" />
          </g>
        </g>

        {/* ── mid-left: aerospace — ground station tracking the sky ── */}
        <g transform="translate(196 528)">
          <path d="M-64 96h128" strokeWidth="4" />
          <path d="M-22 96 0 40h4l20 56" />
          <g transform="rotate(-26)">
            <ellipse rx="70" ry="33" />
            <ellipse rx="40" ry="19" opacity="0.6" />
            <path d="M0 0 6 -46" strokeWidth="3" />
            <circle cx="6" cy="-46" r="8" />
          </g>
          <path d="M64 -78a92 92 0 0 1 40 44" opacity="0.7" />
          <path d="M82 -108a134 134 0 0 1 58 64" opacity="0.45" />
        </g>

        {/* ── mid-right: computer science — a feed-forward network ── */}
        <g transform="translate(1332 462)">
          <g strokeWidth="1.4" opacity="0.6">
            {NET.edges.map(([a, b]) => (
              <path key={`e-${a[0]}-${a[1]}-${b[0]}-${b[1]}`} d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`} />
            ))}
          </g>
          <g stroke="none" fill="currentColor">
            {NET.nodes.map(([x, y]) => (
              <circle key={`n-${x}-${y}`} cx={x} cy={y} r="9" />
            ))}
          </g>
        </g>

        {/* ── upper centre: space — a constellation drawn between stars ── */}
        <g opacity="0.7">
          <path d="M452 104 548 62l70 68 88-34" strokeWidth="1.6" />
          <path d="M548 62 566 158" strokeWidth="1.6" />
          <g stroke="none" fill="currentColor">
            <circle cx="452" cy="104" r="4.5" />
            <circle cx="548" cy="62" r="5.5" />
            <circle cx="618" cy="130" r="4" />
            <circle cx="706" cy="96" r="5" />
            <circle cx="566" cy="158" r="4" />
          </g>
        </g>

        {/* ── lower centre: robotics meets space — a surface rover ── */}
        <g transform="translate(716 792)">
          <rect x="-58" y="-36" width="116" height="46" rx="9" />
          <path d="M-58 -36-92 -58h58" />
          <path d="M34 -36V-74" />
          <rect x="20" y="-96" width="36" height="22" rx="5" />
          <path d="M56 -85h18" opacity="0.7" />
          <g>
            <circle cx="-38" cy="28" r="19" />
            <circle cx="0" cy="28" r="19" />
            <circle cx="38" cy="28" r="19" />
            <path d="M-38 10h76" strokeWidth="2" opacity="0.7" />
          </g>
          <path d="M-104 56h208" strokeDasharray="8 16" opacity="0.5" />
        </g>
      </g>
    </svg>
  );
}
