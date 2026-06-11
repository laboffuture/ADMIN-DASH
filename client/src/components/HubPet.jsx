import { useClaudeAnim } from './ClaudeMark';

// The portal's resident agent: wanders along the bottom of the main area
// (CSS keyframes move + flip the wrapper; pointer-events:none in CSS so it
// can never block a click). Renders nothing if the animation can't load.
export function HubPet() {
  const anim = useClaudeAnim();
  if (!anim) return null;
  const { Lottie, data } = anim;
  return (
    <div className="hub-pet" aria-hidden="true">
      <Lottie animationData={data} loop autoplay />
    </div>
  );
}
