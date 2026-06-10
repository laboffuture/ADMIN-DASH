import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Viewport } from './Viewport';

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
});
