import { useState } from 'react';
import { useClaudeAnim } from './ClaudeMark';
import { AgentChat } from './AgentChat';

// CLAWD, the portal's resident agent: wanders along the bottom of the main
// area (CSS keyframes move + flip him). Clicking him opens the agent chat and
// pauses the walk. Renders nothing if the animation can't load.
export function HubPet() {
  const anim = useClaudeAnim();
  const [open, setOpen] = useState(false);
  if (!anim) return null;
  const { Lottie, data } = anim;
  return (
    <>
      <button
        className={`hub-pet ${open ? 'hub-pet-paused' : ''}`}
        aria-label="Chat with Clawd, the hub agent"
        title="Chat with Clawd"
        onClick={() => setOpen((o) => !o)}
      >
        <Lottie animationData={data} loop autoplay />
      </button>
      {open && <AgentChat onClose={() => setOpen(false)} />}
    </>
  );
}
