import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('lottie-react', () => ({
  default: () => <div data-testid="lottie-player" />,
}));

import { HubPet } from './HubPet';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

describe('HubPet', () => {
  it('walks the portal: renders the animation inside a decorative wandering wrapper', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ v: '5.7.4', op: 43 }) }));
    const { container } = render(<HubPet />);
    await waitFor(() => expect(screen.getByTestId('lottie-player')).toBeInTheDocument());
    const pet = container.querySelector('.hub-pet');
    expect(pet).not.toBeNull();
    expect(pet.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders nothing when the animation cannot load', async () => {
    global.fetch = vi.fn(async () => { throw new Error('offline'); });
    const { container } = render(<HubPet />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container.querySelector('.hub-pet')).toBeNull();
  });
});
