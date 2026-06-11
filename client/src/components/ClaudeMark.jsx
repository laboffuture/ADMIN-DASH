import { useEffect, useState } from 'react';

// Loads the decorative Lottie (client/public/anim/claude.json) plus the
// player library, lazily: the player stays out of the main bundle (and out
// of jsdom, where lottie-web cannot evaluate). Resolves to null on any
// failure — callers render nothing rather than breaking the hub.
export function useClaudeAnim() {
  const [anim, setAnim] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch('/anim/claude.json').then((res) => (res.ok ? res.json() : Promise.reject(new Error('http')))),
      import('lottie-react'),
    ])
      .then(([data, mod]) => { if (mounted) setAnim({ data, Lottie: mod.default }); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  return anim;
}

export function ClaudeMark({ size = 150 }) {
  const anim = useClaudeAnim();
  if (!anim) return null;
  const { Lottie, data } = anim;
  return (
    <div className="claude-mark" aria-hidden="true" style={{ width: size }}>
      <Lottie animationData={data} loop autoplay />
    </div>
  );
}
