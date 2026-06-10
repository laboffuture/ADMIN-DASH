import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from './Login';

afterEach(() => vi.unstubAllGlobals());

function stubFetch(status, body) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  ));
}

describe('Login', () => {
  it('calls onSuccess when the password is accepted', async () => {
    stubFetch(200, { ok: true });
    const onSuccess = vi.fn();
    render(<Login onSuccess={onSuccess} />);
    await userEvent.type(screen.getByPlaceholderText('Admin password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows an error and does not succeed on a wrong password', async () => {
    stubFetch(401, { error: 'invalid password' });
    const onSuccess = vi.fn();
    render(<Login onSuccess={onSuccess} />);
    await userEvent.type(screen.getByPlaceholderText('Admin password'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid password');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
