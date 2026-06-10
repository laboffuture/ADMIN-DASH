import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Viewport } from './Viewport';

afterEach(() => vi.unstubAllGlobals());

const project = {
  id: 'protoview',
  name: 'PROTOVIEW',
  description: '3D model review & voting',
  adminUrl: 'http://10.0.0.5:4000/admin',
};

describe('Viewport', () => {
  it('frames the admin page with embed=1 appended', () => {
    render(<Viewport project={project} status={{ status: 'online' }} onRetry={() => {}} />);
    const frame = screen.getByTitle('PROTOVIEW');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', 'http://10.0.0.5:4000/admin?embed=1');
  });

  it('appends embed=1 with & when the url already has a query', () => {
    const p = { ...project, adminUrl: 'http://10.0.0.5:4000/admin?tab=models' };
    render(<Viewport project={p} status={{ status: 'online' }} onRetry={() => {}} />);
    expect(screen.getByTitle('PROTOVIEW')).toHaveAttribute(
      'src',
      'http://10.0.0.5:4000/admin?tab=models&embed=1',
    );
  });

  it('offers an open-in-new-tab link to the raw admin url', () => {
    render(<Viewport project={project} status={{ status: 'online' }} onRetry={() => {}} />);
    expect(screen.getByTitle('Open in new tab')).toHaveAttribute('href', project.adminUrl);
  });

  it('shows the down panel instead of a frame when the module is down', async () => {
    const onRetry = vi.fn();
    render(<Viewport project={project} status={{ status: 'down' }} onRetry={onRetry} />);
    expect(screen.queryByTitle('PROTOVIEW')).toBeNull();
    expect(screen.getByText(/is not responding/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('asks to select a project when none is selected', () => {
    render(<Viewport project={null} status={undefined} onRetry={() => {}} />);
    expect(screen.getByText(/select a project/i)).toBeInTheDocument();
  });

  it('appends a fetched hub_token for sso-enabled modules', async () => {
    const ssoProject = { ...project, sso: true };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: 'tok123' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ));
    render(<Viewport project={ssoProject} status={{ status: 'online' }} onRetry={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTitle('PROTOVIEW')).toHaveAttribute(
        'src',
        'http://10.0.0.5:4000/admin?embed=1&hub_token=tok123',
      );
    });
    expect(fetch).toHaveBeenCalledWith('/api/sso-token/protoview', expect.anything());
  });

  it('falls back to a tokenless frame when the sso fetch fails', async () => {
    const ssoProject = { ...project, sso: true };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'nope' }), { status: 503, headers: { 'Content-Type': 'application/json' } }),
    ));
    render(<Viewport project={ssoProject} status={{ status: 'online' }} onRetry={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTitle('PROTOVIEW')).toHaveAttribute('src', 'http://10.0.0.5:4000/admin?embed=1');
    });
  });

  it('never fetches a token for non-sso modules', () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    render(<Viewport project={project} status={{ status: 'online' }} onRetry={() => {}} />);
    expect(screen.getByTitle('PROTOVIEW')).toHaveAttribute('src', 'http://10.0.0.5:4000/admin?embed=1');
    expect(spy).not.toHaveBeenCalled();
  });

  it('shows a not-connected panel for modules without an adminUrl', () => {
    const pending = { id: 'qc-agent', name: 'QC AGENT', description: 'quality control agent' };
    render(<Viewport project={pending} status={{ status: 'pending' }} onRetry={() => {}} />);
    expect(screen.getByText(/not connected yet/i)).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.queryByTitle('Open in new tab')).toBeNull();
  });
});
