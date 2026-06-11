import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api', () => ({ api: { agentChat: vi.fn() } }));

import { api } from '../api';
import { AgentChat } from './AgentChat';

beforeEach(() => vi.clearAllMocks());

describe('AgentChat', () => {
  it('greets when opened', () => {
    render(<AgentChat onClose={() => {}} />);
    expect(screen.getByText('CLAWD')).toBeInTheDocument();
    expect(screen.getByText(/hey/i)).toBeInTheDocument();
  });

  it('sends a question and shows Clawd’s reply', async () => {
    api.agentChat.mockResolvedValue({ reply: '1 of 15 modules online.', source: 'local' });
    render(<AgentChat onClose={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/ask clawd/i), 'how is progress?');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText('1 of 15 modules online.')).toBeInTheDocument();
    expect(screen.getByText('how is progress?')).toBeInTheDocument();
    expect(api.agentChat).toHaveBeenCalledWith('how is progress?');
  });

  it('stays friendly when the hub cannot answer', async () => {
    api.agentChat.mockRejectedValue(new Error('500'));
    render(<AgentChat onClose={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/ask clawd/i), 'status?');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText(/can't reach the hub brain/i)).toBeInTheDocument();
  });

  it('closes via the close button', async () => {
    const onClose = vi.fn();
    render(<AgentChat onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
