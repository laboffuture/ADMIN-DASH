import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('lottie-react', () => ({
  default: () => <div data-testid="lottie-player" />,
}));

import { HubPet } from './HubPet';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

describe('HubPet', () => {
  it('walks the portal: renders the animation inside a wandering button', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ v: '5.7.4', op: 43 }) }));
    const { container } = render(<HubPet />);
    await waitFor(() => expect(screen.getByTestId('lottie-player')).toBeInTheDocument());
    const pet = container.querySelector('button.hub-pet');
    expect(pet).not.toBeNull();
  });

  it('opens the Clawd chat when clicked and pauses the walk', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ v: '5.7.4', op: 43 }) }));
    const { container } = render(<HubPet />);
    await waitFor(() => expect(screen.getByTestId('lottie-player')).toBeInTheDocument());
    await userEvent.click(container.querySelector('button.hub-pet'));
    expect(screen.getByPlaceholderText(/ask clawd/i)).toBeInTheDocument();
    expect(container.querySelector('.hub-pet-paused')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByPlaceholderText(/ask clawd/i)).toBeNull();
  });

  it('renders nothing when the animation cannot load', async () => {
    global.fetch = vi.fn(async () => { throw new Error('offline'); });
    const { container } = render(<HubPet />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container.querySelector('.hub-pet')).toBeNull();
  });
});
