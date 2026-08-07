import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from './Login';

afterEach(() => vi.unstubAllGlobals());

function stubFetch(status, body) {
  // fresh Response per call — a Response body is single-use, and the login
  // screen now fires more than one fetch (ClaudeMark animation + /api/login)
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () =>
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

  it('masks the password until the reveal toggle is pressed', async () => {
    render(<Login onSuccess={() => {}} />);
    const field = screen.getByPlaceholderText('Admin password');
    expect(field).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(field).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(field).toHaveAttribute('type', 'password');
  });

  it('does not submit when the reveal toggle is pressed', async () => {
    stubFetch(200, { ok: true });
    const onSuccess = vi.fn();
    render(<Login onSuccess={onSuccess} />);
    await userEvent.type(screen.getByPlaceholderText('Admin password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(onSuccess).not.toHaveBeenCalled();
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
