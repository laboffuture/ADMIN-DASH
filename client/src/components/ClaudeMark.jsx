import { useEffect, useState } from 'react';

// Decorative Lottie mark (client/public/anim/claude.json). Purely cosmetic:
// any failure renders nothing rather than breaking login. The player library
// is imported lazily so it stays out of the main bundle (and out of jsdom,
// where lottie-web cannot evaluate).
export function ClaudeMark({ size = 150 }) {
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

  if (!anim) return null;
  const { Lottie, data } = anim;
  return (
    <div className="claude-mark" aria-hidden="true" style={{ width: size }}>
      <Lottie animationData={data} loop autoplay />
    </div>
  );
}
