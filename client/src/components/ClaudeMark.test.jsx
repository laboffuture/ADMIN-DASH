import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('lottie-react', () => ({
  default: ({ animationData }) => <div data-testid="lottie-player" data-frames={animationData.op} />,
}));

import { ClaudeMark } from './ClaudeMark';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

describe('ClaudeMark', () => {
  it('renders the animation once /anim/claude.json loads', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ v: '5.7.4', op: 43 }) }));
    render(<ClaudeMark />);
    await waitFor(() => expect(screen.getByTestId('lottie-player')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('/anim/claude.json');
    expect(screen.getByTestId('lottie-player').dataset.frames).toBe('43');
  });

  it('renders nothing when the animation cannot be fetched', async () => {
    global.fetch = vi.fn(async () => { throw new Error('offline'); });
    const { container } = render(<ClaudeMark />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });
});
